"use server";

import pool from "@/lib/db";
import { checkIsAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { RowDataPacket } from "mysql2/promise";

// Helper to ensure caller is Admin in CRAS scope
async function assertAdmin() {
  const check = await checkIsAdmin();
  if (!check.isAdmin) {
    throw new Error("Unauthorized: Administrator permissions (Admin in CRAS) required.");
  }
  return check;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. RESOURCE ACTIONS (Insert, Update, Delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResourceFormData {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
}

export async function createResourceAction(
  data: ResourceFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const id = data.id?.trim();
    const name = data.name?.trim();
    const type = data.type?.trim();
    const capacity = Number(data.capacity);
    const location = data.location?.trim();
    const status = data.status || "AVAILABLE";

    if (!id || !name || !type || !location) {
      return { success: false, error: "All resource fields are required." };
    }

    if (isNaN(capacity) || capacity <= 0) {
      return { success: false, error: "Capacity must be a positive integer." };
    }

    // Check if ID already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM resources WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length > 0) {
      return { success: false, error: `A resource with ID '${id}' already exists.` };
    }

    await pool.execute(
      `INSERT INTO resources (id, name, type, capacity, location, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, type, capacity, location, status]
    );

    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/facilities");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create resource:", error);
    const message = error instanceof Error ? error.message : "Failed to create resource.";
    return { success: false, error: message };
  }
}

export async function updateResourceAction(
  data: ResourceFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const id = data.id?.trim();
    const name = data.name?.trim();
    const type = data.type?.trim();
    const capacity = Number(data.capacity);
    const location = data.location?.trim();
    const status = data.status || "AVAILABLE";

    if (!id || !name || !type || !location) {
      return { success: false, error: "All resource fields are required." };
    }

    if (isNaN(capacity) || capacity <= 0) {
      return { success: false, error: "Capacity must be a positive integer." };
    }

    await pool.execute(
      `UPDATE resources
       SET name = ?, type = ?, capacity = ?, location = ?, status = ?
       WHERE id = ?`,
      [name, type, capacity, location, status, id]
    );

    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/facilities");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update resource:", error);
    const message = error instanceof Error ? error.message : "Failed to update resource.";
    return { success: false, error: message };
  }
}

export async function deleteResourceAction(
  resid: string
): Promise<{ success: true } | { success: false; error: string }> {
  const conn = await pool.getConnection();
  try {
    await assertAdmin();

    const cleanId = resid?.trim();
    if (!cleanId) {
      return { success: false, error: "Resource ID is required." };
    }

    await conn.beginTransaction();

    // 1. Get all request IDs targeting this resource
    const [requestRows] = await conn.execute<RowDataPacket[]>(
      `SELECT reqid FROM requests WHERE resid = ?`,
      [cleanId]
    );
    const reqIds = requestRows.map((r) => r.reqid);

    if (reqIds.length > 0) {
      // Delete allocations for these requests
      await conn.query(
        `DELETE FROM allocations WHERE reqid IN (?)`,
        [reqIds]
      );
      // Delete approval steps for these requests
      await conn.query(
        `DELETE FROM approval_steps WHERE reqid IN (?)`,
        [reqIds]
      );
      // Delete requests
      await conn.execute(
        `DELETE FROM requests WHERE resid = ?`,
        [cleanId]
      );
    }

    // 2. Delete approval steps that link to hierarchies of this resource
    await conn.execute(
      `DELETE ast FROM approval_steps ast
       INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
       WHERE ah.resid = ?`,
      [cleanId]
    );

    // 3. Delete approval hierarchies
    await conn.execute(
      `DELETE FROM approval_hierarchies WHERE resid = ?`,
      [cleanId]
    );

    // 4. Delete the resource itself
    await conn.execute(
      `DELETE FROM resources WHERE id = ?`,
      [cleanId]
    );

    await conn.commit();

    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/facilities");
    return { success: true };
  } catch (error: unknown) {
    await conn.rollback();
    console.error("Failed to delete resource:", error);
    const message = error instanceof Error ? error.message : "Failed to delete resource.";
    return { success: false, error: message };
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. USER & ROLE MANAGEMENT ACTIONS (Delete User, Assign Role, Revoke Role)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteUserAction(
  targetUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const conn = await pool.getConnection();
  try {
    const admin = await assertAdmin();

    const cleanUserId = targetUserId?.trim();
    if (!cleanUserId) {
      return { success: false, error: "Target user ID is required." };
    }

    if (admin.userId === cleanUserId) {
      return { success: false, error: "You cannot delete your currently active administrator account." };
    }

    await conn.beginTransaction();

    // 1. Clear approver action references in approval steps so foreign key constraints pass
    await conn.execute(
      `UPDATE approval_steps
       SET ActionByUserId = NULL, ActionAsAssignmentId = NULL
       WHERE ActionByUserId = ?`,
      [cleanUserId]
    );

    // 2. Handle requests submitted by this user
    const [userReqs] = await conn.execute<RowDataPacket[]>(
      `SELECT reqid FROM requests WHERE requesterid = ?`,
      [cleanUserId]
    );
    const reqIds = userReqs.map((r) => r.reqid);

    if (reqIds.length > 0) {
      await conn.query(
        `DELETE FROM allocations WHERE reqid IN (?)`,
        [reqIds]
      );
      await conn.query(
        `DELETE FROM approval_steps WHERE reqid IN (?)`,
        [reqIds]
      );
      await conn.execute(
        `DELETE FROM requests WHERE requesterid = ?`,
        [cleanUserId]
      );
    }

    // 3. Delete role assignments
    await conn.execute(
      `DELETE FROM role_assignments WHERE UserId = ?`,
      [cleanUserId]
    );

    // 4. Delete auth accounts and sessions if any
    await conn.execute(
      `DELETE FROM account WHERE userId = ?`,
      [cleanUserId]
    );
    await conn.execute(
      `DELETE FROM session WHERE userId = ?`,
      [cleanUserId]
    );

    // 5. Delete the user
    await conn.execute(
      `DELETE FROM users WHERE id = ?`,
      [cleanUserId]
    );

    await conn.commit();

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: unknown) {
    await conn.rollback();
    console.error("Failed to delete user:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return { success: false, error: message };
  } finally {
    conn.release();
  }
}

export async function assignRoleToUserAction(
  userId: string,
  roleId: string,
  scopeId: string,
  validUntil?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const cleanUserId = userId?.trim();
    const cleanRoleId = roleId?.trim();
    const cleanScopeId = scopeId?.trim();

    if (!cleanUserId || !cleanRoleId || !cleanScopeId) {
      return { success: false, error: "User, Role, and Scope are all required." };
    }

    // Format validUntil if provided
    let untilDate: string | null = null;
    if (validUntil && validUntil.trim()) {
      untilDate = new Date(validUntil).toISOString().slice(0, 19).replace("T", " ");
    }

    await pool.execute(
      `INSERT INTO role_assignments (UserId, RoleId, ScopeId, ValidFrom, ValidUntil)
       VALUES (?, ?, ?, NOW(), ?)`,
      [cleanUserId, cleanRoleId, cleanScopeId, untilDate]
    );

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to assign role to user:", error);
    const message = error instanceof Error ? error.message : "Failed to assign role.";
    return { success: false, error: message };
  }
}

export async function revokeRoleFromUserAction(
  assignmentId: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    if (!assignmentId) {
      return { success: false, error: "Assignment ID is required." };
    }

    // Try deleting first; if referenced by a historical request or approval step, expire it immediately
    try {
      await pool.execute(
        `DELETE FROM role_assignments WHERE AssignmentId = ?`,
        [assignmentId]
      );
    } catch {
      // Fallback: expire it immediately so it is no longer active
      await pool.execute(
        `UPDATE role_assignments
         SET ValidUntil = DATE_SUB(NOW(), INTERVAL 1 SECOND)
         WHERE AssignmentId = ?`,
        [assignmentId]
      );
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to revoke role assignment:", error);
    const message = error instanceof Error ? error.message : "Failed to revoke role assignment.";
    return { success: false, error: message };
  }
}

