import pool from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { RowDataPacket } from "mysql2/promise";
import ResourcesAdminView, {
  AdminResourceItem,
  ResourceHierarchyItem,
  OptionRole,
  OptionScope,
} from "@/components/admin/ResourcesAdminView";

interface DbResourceRow extends RowDataPacket {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
  activeAllocations: number;
  totalRequests: number;
}

interface DbHierarchyRow extends RowDataPacket {
  hid: string;
  hlevel: number;
  resid: string;
  roleId: string;
  roleName: string;
  scopeId: string | null;
  scopeName: string | null;
}

interface DbRoleRow extends RowDataPacket {
  roleId: string;
  roleName: string;
}

interface DbScopeRow extends RowDataPacket {
  scopeId: string;
  scopeName: string;
}

export default async function AdminResourcesPage() {
  await requireAdmin();

  // 1. Fetch all resources with allocation and request counts
  const [resourceRows] = await pool.execute<DbResourceRow[]>(`
    SELECT
      r.id,
      r.name,
      r.type,
      r.capacity,
      r.location,
      r.status,
      COUNT(DISTINCT a.allocationid) AS activeAllocations,
      COUNT(DISTINCT req.reqid) AS totalRequests
    FROM resources r
    LEFT JOIN requests req ON req.resid = r.id
    LEFT JOIN allocations a ON a.reqid = req.reqid AND a.allocationstatus IN ('SCHEDULED', 'ONGOING')
    GROUP BY r.id, r.name, r.type, r.capacity, r.location, r.status
    ORDER BY r.type ASC, r.name ASC
  `);

  // 2. Fetch all approval hierarchies with roles and scopes
  const [hierarchyRows] = await pool.execute<DbHierarchyRow[]>(`
    SELECT
      ah.hid,
      ah.hlevel,
      ah.resid,
      ah.RoleId AS roleId,
      r.RoleName AS roleName,
      ah.ScopeId AS scopeId,
      s.ScopeName AS scopeName
    FROM approval_hierarchies ah
    INNER JOIN roles r ON ah.RoleId = r.RoleId
    LEFT JOIN scopes s ON ah.ScopeId = s.ScopeId
    ORDER BY ah.resid ASC, ah.hlevel ASC
  `);

  // 3. Fetch available roles & scopes for admin selection
  const [roleRows] = await pool.execute<DbRoleRow[]>(`
    SELECT RoleId AS roleId, RoleName AS roleName
    FROM roles
    ORDER BY RoleName ASC
  `);

  const [scopeRows] = await pool.execute<DbScopeRow[]>(`
    SELECT ScopeId AS scopeId, ScopeName AS scopeName
    FROM scopes
    ORDER BY ScopeName ASC
  `);

  // Group hierarchies by resid
  const hierarchiesByResId = new Map<string, ResourceHierarchyItem[]>();
  for (const h of hierarchyRows) {
    const list = hierarchiesByResId.get(h.resid) || [];
    list.push({
      hid: h.hid,
      hlevel: h.hlevel,
      roleId: h.roleId,
      roleName: h.roleName,
      scopeId: h.scopeId,
      scopeName: h.scopeName || "Any Scope",
    });
    hierarchiesByResId.set(h.resid, list);
  }

  const initialResources: AdminResourceItem[] = resourceRows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    location: r.location,
    status: r.status,
    activeAllocations: Number(r.activeAllocations) || 0,
    totalRequests: Number(r.totalRequests) || 0,
    hierarchies: hierarchiesByResId.get(r.id) || [],
  }));

  const availableRoles: OptionRole[] = roleRows.map((r) => ({
    roleId: r.roleId,
    roleName: r.roleName,
  }));

  const availableScopes: OptionScope[] = scopeRows.map((s) => ({
    scopeId: s.scopeId,
    scopeName: s.scopeName,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="pb-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            Institutional Facilities
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Campus Facilities & Resources
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Provision new campus spaces, configure multi-tier approval hierarchies, update capacities, and manage operational availability.
        </p>
      </div>

      <ResourcesAdminView
        initialResources={initialResources}
        availableRoles={availableRoles}
        availableScopes={availableScopes}
      />
    </div>
  );
}

