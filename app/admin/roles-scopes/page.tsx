import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import RolesScopesAdminView, {
  AdminRoleItem,
  AdminScopeItem,
} from "@/components/admin/RolesScopesAdminView";

export const dynamic = 'force-dynamic';

interface DbRoleUsageRow extends RowDataPacket {
  roleId: string;
  roleName: string;
  assignmentCount: number;
  hierarchyCount: number;
}

interface DbScopeUsageRow extends RowDataPacket {
  scopeId: string;
  scopeName: string;
  scopeType: string;
  assignmentCount: number;
  hierarchyCount: number;
}

export default async function AdminRolesScopesPage() {
  await requireAdmin();

  // 1. Fetch all roles with active assignment and approval hierarchy counts
  const [roleRows] = await pool.execute<DbRoleUsageRow[]>(`
    SELECT
      r.RoleId AS roleId,
      r.RoleName AS roleName,
      COUNT(DISTINCT ra.AssignmentId) AS assignmentCount,
      COUNT(DISTINCT ah.hid) AS hierarchyCount
    FROM roles r
    LEFT JOIN role_assignments ra ON r.RoleId = ra.RoleId AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
    LEFT JOIN approval_hierarchies ah ON r.RoleId = ah.RoleId
    GROUP BY r.RoleId, r.RoleName
    ORDER BY r.RoleName ASC
  `);

  // 2. Fetch all scopes with active assignment and approval hierarchy counts
  const [scopeRows] = await pool.execute<DbScopeUsageRow[]>(`
    SELECT
      s.ScopeId AS scopeId,
      s.ScopeName AS scopeName,
      s.ScopeType AS scopeType,
      COUNT(DISTINCT ra.AssignmentId) AS assignmentCount,
      COUNT(DISTINCT ah.hid) AS hierarchyCount
    FROM scopes s
    LEFT JOIN role_assignments ra ON s.ScopeId = ra.ScopeId AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
    LEFT JOIN approval_hierarchies ah ON s.ScopeId = ah.ScopeId
    GROUP BY s.ScopeId, s.ScopeName, s.ScopeType
    ORDER BY s.ScopeName ASC
  `);

  const initialRoles: AdminRoleItem[] = roleRows.map((r) => ({
    roleId: r.roleId,
    roleName: r.roleName,
    assignmentCount: Number(r.assignmentCount) || 0,
    hierarchyCount: Number(r.hierarchyCount) || 0,
  }));

  const initialScopes: AdminScopeItem[] = scopeRows.map((s) => ({
    scopeId: s.scopeId,
    scopeName: s.scopeName,
    scopeType: s.scopeType || "DEPARTMENT",
    assignmentCount: Number(s.assignmentCount) || 0,
    hierarchyCount: Number(s.hierarchyCount) || 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            Access Governance
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Roles & Institutional Scopes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Define institutional roles, academic departments, clubs, and governance scopes that power authorization checks and multi-level approval hierarchies.
        </p>
      </div>

      <RolesScopesAdminView
        initialRoles={initialRoles}
        initialScopes={initialScopes}
      />
    </div>
  );
}
