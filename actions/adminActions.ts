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

export interface HierarchyStepInput {
  hid?: string;
  hlevel: number;
  roleId: string;
  scopeId?: string | null;
}

export interface ResourceFormData {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  hierarchies?: HierarchyStepInput[];
}

export async function createResourceAction(
  data: ResourceFormData
): Promise<{ success: true } | { success: false; error: string }> {
  const conn = await pool.getConnection();
  try {
    await assertAdmin();

    const id = data.id?.trim();
    const name = data.name?.trim();
    const type = data.type?.trim();
    const capacity = Number(data.capacity);
    const location = data.location?.trim();
    const status = data.status || "AVAILABLE";
    const hierarchies = data.hierarchies || [];

    if (!id || !name || !type || !location) {
      return { success: false, error: "All resource fields are required." };
    }

    if (isNaN(capacity) || capacity <= 0) {
      return { success: false, error: "Capacity must be a positive integer." };
    }

    // Must have at least 1 approval hierarchy
    if (hierarchies.length === 0) {
      return { success: false, error: "A resource must have at least one approval hierarchy step." };
    }

    // Validate each hierarchy step has a mandatory Role
    for (let i = 0; i < hierarchies.length; i++) {
      const step = hierarchies[i];
      if (!step.roleId || !step.roleId.trim()) {
        return { success: false, error: `Role is mandatory for Approval Level ${i + 1}.` };
      }
    }

    await conn.beginTransaction();

    // Check if ID already exists
    const [existing] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM resources WHERE id = ? LIMIT 1`,
      [id]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return { success: false, error: `A resource with ID '${id}' already exists.` };
    }

    await conn.execute(
      `INSERT INTO resources (id, name, type, capacity, location, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, type, capacity, location, status]
    );

    // Insert approval hierarchies
    const cleanId = id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    for (let i = 0; i < hierarchies.length; i++) {
      const step = hierarchies[i];
      const level = i + 1;
      const hid = `H-${cleanId.slice(0, 12)}-L${level}`.slice(0, 20);
      const roleId = step.roleId.trim();
      const scopeId = step.scopeId && step.scopeId.trim() !== "" ? step.scopeId.trim() : null;

      await conn.execute(
        `INSERT INTO approval_hierarchies (hid, hlevel, resid, RoleId, ScopeId)
         VALUES (?, ?, ?, ?, ?)`,
        [hid, level, id, roleId, scopeId]
      );
    }

    await conn.commit();

    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/facilities");
    revalidatePath("/dashboard/requests");
    return { success: true };
  } catch (error: unknown) {
    await conn.rollback();
    console.error("Failed to create resource:", error);
    const message = error instanceof Error ? error.message : "Failed to create resource.";
    return { success: false, error: message };
  } finally {
    conn.release();
  }
}

export async function updateResourceAction(
  data: ResourceFormData
): Promise<{ success: true } | { success: false; error: string }> {
  const conn = await pool.getConnection();
  try {
    await assertAdmin();

    const id = data.id?.trim();
    const name = data.name?.trim();
    const type = data.type?.trim();
    const capacity = Number(data.capacity);
    const location = data.location?.trim();
    const status = data.status || "AVAILABLE";
    const hierarchies = data.hierarchies || [];

    if (!id || !name || !type || !location) {
      return { success: false, error: "All resource fields are required." };
    }

    if (isNaN(capacity) || capacity <= 0) {
      return { success: false, error: "Capacity must be a positive integer." };
    }

    // Must always have at least 1 approval hierarchy
    if (hierarchies.length === 0) {
      return { success: false, error: "A resource must always have at least 1 approval hierarchy." };
    }

    // Validate each hierarchy step has a mandatory Role
    for (let i = 0; i < hierarchies.length; i++) {
      const step = hierarchies[i];
      if (!step.roleId || !step.roleId.trim()) {
        return { success: false, error: `Role is mandatory for Approval Level ${i + 1}.` };
      }
    }

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE resources
       SET name = ?, type = ?, capacity = ?, location = ?, status = ?
       WHERE id = ?`,
      [name, type, capacity, location, status, id]
    );

    // Fetch existing hierarchies for this resource
    const [existingHierarchies] = await conn.execute<RowDataPacket[]>(
      `SELECT hid, hlevel, RoleId, ScopeId FROM approval_hierarchies WHERE resid = ? ORDER BY hlevel ASC`,
      [id]
    );

    const cleanId = id.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // 1. Update or insert new levels
    for (let i = 0; i < hierarchies.length; i++) {
      const step = hierarchies[i];
      const level = i + 1;
      const roleId = step.roleId.trim();
      const scopeId = step.scopeId && step.scopeId.trim() !== "" ? step.scopeId.trim() : null;

      const existingStep = existingHierarchies.find((eh) => eh.hlevel === level);

      if (existingStep) {
        // Update existing hierarchy row (preserves hid and FK relationships)
        await conn.execute(
          `UPDATE approval_hierarchies
           SET RoleId = ?, ScopeId = ?
           WHERE hid = ?`,
          [roleId, scopeId, existingStep.hid]
        );
      } else {
        // Insert new level
        let newHid = `H-${cleanId.slice(0, 12)}-L${level}`.slice(0, 20);
        const [dup] = await conn.execute<RowDataPacket[]>(
          `SELECT hid FROM approval_hierarchies WHERE hid = ? LIMIT 1`,
          [newHid]
        );
        if (dup.length > 0) {
          newHid = `H-${cleanId.slice(0, 8)}-L${level}-${Math.floor(Math.random() * 90 + 10)}`.slice(0, 20);
        }

        await conn.execute(
          `INSERT INTO approval_hierarchies (hid, hlevel, resid, RoleId, ScopeId)
           VALUES (?, ?, ?, ?, ?)`,
          [newHid, level, id, roleId, scopeId]
        );
      }
    }

    // 2. If existing had more levels than new list, remove the extra levels
    if (existingHierarchies.length > hierarchies.length) {
      const extraHierarchies = existingHierarchies.filter((eh) => eh.hlevel > hierarchies.length);

      for (const extra of extraHierarchies) {
        // Check if any active PENDING request uses this step
        const [pending] = await conn.execute<RowDataPacket[]>(
          `SELECT ast.reqid
           FROM approval_steps ast
           INNER JOIN requests req ON ast.reqid = req.reqid
           WHERE ast.hid = ? AND req.reqstatus = 'PENDING'
           LIMIT 1`,
          [extra.hid]
        );

        if (pending.length > 0) {
          await conn.rollback();
          return {
            success: false,
            error: `Cannot remove Level ${extra.hlevel}: Active pending request #${pending[0].reqid} is currently awaiting approval at this step.`,
          };
        }

        // Clean up any historical approval steps associated with this removed hierarchy
        await conn.execute(
          `DELETE FROM approval_steps WHERE hid = ?`,
          [extra.hid]
        );

        // Delete the hierarchy step
        await conn.execute(
          `DELETE FROM approval_hierarchies WHERE hid = ?`,
          [extra.hid]
        );
      }
    }

    await conn.commit();

    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/facilities");
    revalidatePath("/dashboard/requests");
    return { success: true };
  } catch (error: unknown) {
    await conn.rollback();
    console.error("Failed to update resource:", error);
    const message = error instanceof Error ? error.message : "Failed to update resource.";
    return { success: false, error: message };
  } finally {
    conn.release();
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROLE & SCOPE DEFINITION ACTIONS (Insert, Update, Delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleFormData {
  roleId: string;
  roleName: string;
}

export interface ScopeFormData {
  scopeId: string;
  scopeName: string;
  scopeType: string;
}

export async function createRoleAction(
  data: RoleFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    let roleId = data.roleId?.trim().toUpperCase();
    const roleName = data.roleName?.trim();

    if (!roleId || !roleName) {
      return { success: false, error: "Role ID and Role Name are required." };
    }

    if (!roleId.startsWith("ROLE-")) {
      roleId = `ROLE-${roleId}`;
    }

    // Check if RoleId already exists
    const [existingId] = await pool.execute<RowDataPacket[]>(
      `SELECT RoleId FROM roles WHERE RoleId = ? LIMIT 1`,
      [roleId]
    );
    if (existingId.length > 0) {
      return { success: false, error: `Role ID '${roleId}' already exists.` };
    }

    // Check if RoleName already exists
    const [existingName] = await pool.execute<RowDataPacket[]>(
      `SELECT RoleId FROM roles WHERE RoleName = ? LIMIT 1`,
      [roleName]
    );
    if (existingName.length > 0) {
      return { success: false, error: `A role with the name '${roleName}' already exists.` };
    }

    await pool.execute(
      `INSERT INTO roles (RoleId, RoleName) VALUES (?, ?)`,
      [roleId, roleName]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create role:", error);
    const message = error instanceof Error ? error.message : "Failed to create role.";
    return { success: false, error: message };
  }
}

export async function updateRoleAction(
  data: RoleFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const roleId = data.roleId?.trim();
    const roleName = data.roleName?.trim();

    if (!roleId || !roleName) {
      return { success: false, error: "Role ID and Role Name are required." };
    }

    // Check if new name is taken by another role
    const [existingName] = await pool.execute<RowDataPacket[]>(
      `SELECT RoleId FROM roles WHERE RoleName = ? AND RoleId != ? LIMIT 1`,
      [roleName, roleId]
    );
    if (existingName.length > 0) {
      return { success: false, error: `Another role is already using the name '${roleName}'.` };
    }

    await pool.execute(
      `UPDATE roles SET RoleName = ? WHERE RoleId = ?`,
      [roleName, roleId]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update role:", error);
    const message = error instanceof Error ? error.message : "Failed to update role.";
    return { success: false, error: message };
  }
}

export async function deleteRoleAction(
  roleId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const cleanId = roleId?.trim();
    if (!cleanId) {
      return { success: false, error: "Role ID is required." };
    }

    // Never allow deleting the primary Admin role
    if (cleanId === "ROLE-ADMIN" || cleanId.toUpperCase() === "ROLE-ADMIN") {
      return { success: false, error: "The primary system Admin role cannot be deleted." };
    }

    // Check references in role_assignments
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM role_assignments WHERE RoleId = ?`,
      [cleanId]
    );
    const assignCount = Number(assignRows[0]?.count) || 0;

    // Check references in approval_hierarchies
    const [hierRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM approval_hierarchies WHERE RoleId = ?`,
      [cleanId]
    );
    const hierCount = Number(hierRows[0]?.count) || 0;

    if (assignCount > 0 || hierCount > 0) {
      return {
        success: false,
        error: `Cannot delete Role '${cleanId}': It is referenced by ${assignCount} role assignment(s) and ${hierCount} resource approval hierarchy(ies). Revoke or reassign these first.`,
      };
    }

    await pool.execute(
      `DELETE FROM roles WHERE RoleId = ?`,
      [cleanId]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete role:", error);
    const message = error instanceof Error ? error.message : "Failed to delete role.";
    return { success: false, error: message };
  }
}

export async function createScopeAction(
  data: ScopeFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    let scopeId = data.scopeId?.trim().toUpperCase();
    const scopeName = data.scopeName?.trim();
    const scopeType = (data.scopeType?.trim() || "DEPARTMENT").toUpperCase();

    if (!scopeId || !scopeName) {
      return { success: false, error: "Scope ID and Scope Name are required." };
    }

    if (!scopeId.startsWith("SCOPE-")) {
      scopeId = `SCOPE-${scopeId}`;
    }

    // Check if ScopeId already exists
    const [existingId] = await pool.execute<RowDataPacket[]>(
      `SELECT ScopeId FROM scopes WHERE ScopeId = ? LIMIT 1`,
      [scopeId]
    );
    if (existingId.length > 0) {
      return { success: false, error: `Scope ID '${scopeId}' already exists.` };
    }

    // Check if ScopeName already exists
    const [existingName] = await pool.execute<RowDataPacket[]>(
      `SELECT ScopeId FROM scopes WHERE ScopeName = ? LIMIT 1`,
      [scopeName]
    );
    if (existingName.length > 0) {
      return { success: false, error: `A scope with the name '${scopeName}' already exists.` };
    }

    await pool.execute(
      `INSERT INTO scopes (ScopeId, ScopeName, ScopeType) VALUES (?, ?, ?)`,
      [scopeId, scopeName, scopeType]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create scope:", error);
    const message = error instanceof Error ? error.message : "Failed to create scope.";
    return { success: false, error: message };
  }
}

export async function updateScopeAction(
  data: ScopeFormData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const scopeId = data.scopeId?.trim();
    const scopeName = data.scopeName?.trim();
    const scopeType = (data.scopeType?.trim() || "DEPARTMENT").toUpperCase();

    if (!scopeId || !scopeName) {
      return { success: false, error: "Scope ID and Scope Name are required." };
    }

    // Check if new name is taken by another scope
    const [existingName] = await pool.execute<RowDataPacket[]>(
      `SELECT ScopeId FROM scopes WHERE ScopeName = ? AND ScopeId != ? LIMIT 1`,
      [scopeName, scopeId]
    );
    if (existingName.length > 0) {
      return { success: false, error: `Another scope is already using the name '${scopeName}'.` };
    }

    await pool.execute(
      `UPDATE scopes SET ScopeName = ?, ScopeType = ? WHERE ScopeId = ?`,
      [scopeName, scopeType, scopeId]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update scope:", error);
    const message = error instanceof Error ? error.message : "Failed to update scope.";
    return { success: false, error: message };
  }
}

export async function deleteScopeAction(
  scopeId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin();

    const cleanId = scopeId?.trim();
    if (!cleanId) {
      return { success: false, error: "Scope ID is required." };
    }

    // Never allow deleting the primary CRAS scope
    if (cleanId === "SCOPE-CRAS" || cleanId.toUpperCase() === "SCOPE-CRAS") {
      return { success: false, error: "The primary CRAS scope cannot be deleted." };
    }

    // Check references in role_assignments
    const [assignRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM role_assignments WHERE ScopeId = ?`,
      [cleanId]
    );
    const assignCount = Number(assignRows[0]?.count) || 0;

    // Check references in approval_hierarchies
    const [hierRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM approval_hierarchies WHERE ScopeId = ?`,
      [cleanId]
    );
    const hierCount = Number(hierRows[0]?.count) || 0;

    if (assignCount > 0 || hierCount > 0) {
      return {
        success: false,
        error: `Cannot delete Scope '${cleanId}': It is referenced by ${assignCount} role assignment(s) and ${hierCount} resource approval hierarchy(ies). Revoke or reassign these first.`,
      };
    }

    await pool.execute(
      `DELETE FROM scopes WHERE ScopeId = ?`,
      [cleanId]
    );

    revalidatePath("/admin/roles-scopes");
    revalidatePath("/admin/users");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete scope:", error);
    const message = error instanceof Error ? error.message : "Failed to delete scope.";
    return { success: false, error: message };
  }
}

