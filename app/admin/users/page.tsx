import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import UsersAdminView, {
  AdminUserItem,
  UserRoleAssignmentDetail,
  OptionRole,
  OptionScope,
} from "@/components/admin/UsersAdminView";

interface DbUserRow extends RowDataPacket {
  id: string;
  name: string | null;
  email: string | null;
  phno: string | null;
  image: string | null;
}

interface DbAssignmentRow extends RowDataPacket {
  assignmentId: number;
  userId: string;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  validFrom: Date;
  validUntil: Date | null;
  isActive: number;
}

interface DbRoleRow extends RowDataPacket {
  roleId: string;
  roleName: string;
}

interface DbScopeRow extends RowDataPacket {
  scopeId: string;
  scopeName: string;
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  // 1. Fetch all users
  const [userRows] = await pool.execute<DbUserRow[]>(`
    SELECT id, name, email, phno, image
    FROM users
    ORDER BY name ASC
  `);

  // 2. Fetch all role assignments
  const [assignRows] = await pool.execute<DbAssignmentRow[]>(`
    SELECT
      ra.AssignmentId AS assignmentId,
      ra.UserId AS userId,
      ra.RoleId AS roleId,
      r.RoleName AS roleName,
      ra.ScopeId AS scopeId,
      s.ScopeName AS scopeName,
      ra.ValidFrom AS validFrom,
      ra.ValidUntil AS validUntil,
      (ra.ValidFrom <= NOW() AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())) AS isActive
    FROM role_assignments ra
    INNER JOIN roles r ON ra.RoleId = r.RoleId
    INNER JOIN scopes s ON ra.ScopeId = s.ScopeId
    ORDER BY isActive DESC, ra.ValidFrom DESC
  `);

  // Map assignments by userId
  const assignmentsByUserId = new Map<string, UserRoleAssignmentDetail[]>();
  for (const a of assignRows) {
    const list = assignmentsByUserId.get(a.userId) || [];
    list.push({
      assignmentId: a.assignmentId,
      userId: a.userId,
      roleId: a.roleId,
      roleName: a.roleName,
      scopeId: a.scopeId,
      scopeName: a.scopeName,
      validFrom: a.validFrom.toISOString(),
      validUntil: a.validUntil ? a.validUntil.toISOString() : null,
      isActive: Boolean(a.isActive),
    });
    assignmentsByUserId.set(a.userId, list);
  }

  const initialUsers: AdminUserItem[] = userRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phno: u.phno,
    image: u.image,
    assignments: assignmentsByUserId.get(u.id) || [],
  }));

  // 3. Fetch available roles & scopes for dropdowns
  const [roleRows] = await pool.execute<DbRoleRow[]>(`
    SELECT RoleId AS roleId, RoleName AS roleName FROM roles ORDER BY RoleName ASC
  `);
  const [scopeRows] = await pool.execute<DbScopeRow[]>(`
    SELECT ScopeId AS scopeId, ScopeName AS scopeName FROM scopes ORDER BY ScopeName ASC
  `);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            Access Governance
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          User & Role Governance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Directory of registered campus accounts. Grant or revoke role-scope authorities, manage time-bound authorizations, and monitor user accounts.
        </p>
      </div>

      <UsersAdminView
        initialUsers={initialUsers}
        availableRoles={roleRows}
        availableScopes={scopeRows}
        currentAdminUserId={admin.userId}
      />
    </div>
  );
}

