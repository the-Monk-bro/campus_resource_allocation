import pool from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RowDataPacket } from "mysql2/promise";
import { redirect } from "next/navigation";

export interface AdminUserCheck {
  isAdmin: boolean;
  userId?: string;
  name?: string;
  email?: string;
}

export async function checkIsAdmin(): Promise<AdminUserCheck> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { isAdmin: false };
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.name, u.email
       FROM role_assignments ra
       INNER JOIN users u ON ra.UserId = u.id
       INNER JOIN roles r ON ra.RoleId = r.RoleId
       INNER JOIN scopes s ON ra.ScopeId = s.ScopeId
       WHERE u.email = ?
         AND r.RoleName = 'Admin'
         AND s.ScopeName = 'CRAS'
         AND ra.ValidFrom <= NOW()
         AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       LIMIT 1`,
      [session.user.email]
    );

    if (rows && rows.length > 0) {
      return {
        isAdmin: true,
        userId: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
      };
    }

    return { isAdmin: false };
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage') || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error("Error checking admin status:", err);
    return { isAdmin: false };
  }
}

export async function requireAdmin(): Promise<AdminUserCheck> {
  const check = await checkIsAdmin();
  if (!check.isAdmin) {
    redirect("/dashboard");
  }
  return check;
}

