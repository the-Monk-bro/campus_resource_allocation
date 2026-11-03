export interface ResourceItem {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
}

export interface UserActiveRoleAssignment {
  assignmentId: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  scopeType: string;
}

export interface ApprovalStepDetail {
  hid: string;
  hlevel: number;
  roleId?: string;
  roleName?: string;
  scopeId?: string;
  scopeName?: string;
  scopeType?: string;
  approverid: string;
  approverName: string | null;
  approverEmail: string | null;
  actionByUserId?: string | null;
  actionByName?: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: string;
  actiontime: string | null;
  shortcomment: string | null;
}

export interface RequestRecord {
  reqid: number;
  requesterid: string;
  requesterAssignmentId?: number;
  requesterRoleName?: string | null;
  requesterScopeName?: string | null;
  requesterScopeType?: string | null;
  resid: string;
  purpose: string | null;
  reqtime: string; // ISO string
  starttime: string; // ISO string
  endtime: string; // ISO string
  reqstatus: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  resourceName?: string | null;
  resourceType?: string | null;
  resourceLocation?: string | null;
  approvalSteps?: ApprovalStepDetail[];
}

export interface ApproverInfo {
  hid: string;
  hlevel: number;
  roleId: string;
  roleName: string;
  scopeId: string;
  scopeName: string;
  scopeType: string;
  currentApproverName: string | null;
  currentApproverEmail: string | null;
}
