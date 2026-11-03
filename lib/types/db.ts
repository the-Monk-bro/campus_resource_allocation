import { RowDataPacket } from "mysql2/promise";

export type ResourceStatus = "AVAILABLE" | "MAINTENANCE" | "RETIRED";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AllocationStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface UserRow extends RowDataPacket {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  password: string | null;
  phno: string | null;
}

export interface RoleRow extends RowDataPacket {
  RoleId: string;
  RoleName: string;
}

export interface ScopeRow extends RowDataPacket {
  ScopeId: string;
  ScopeName: string;
  ScopeType: string;
}

export interface RoleAssignmentRow extends RowDataPacket {
  AssignmentId: number;
  UserId: string;
  RoleId: string;
  ScopeId: string;
  ValidFrom: Date;
  ValidUntil: Date | null;
}

export interface UserRoleAssignmentDetail extends RowDataPacket {
  AssignmentId: number;
  UserId: string;
  RoleId: string;
  RoleName: string;
  ScopeId: string;
  ScopeName: string;
  ScopeType: string;
  ValidFrom: Date;
  ValidUntil: Date | null;
  isActive: boolean;
}

export interface AccountRow extends RowDataPacket {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface SessionRow extends RowDataPacket {
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface VerificationTokenRow extends RowDataPacket {
  identifier: string;
  token: string;
  expires: Date;
}

export interface ResourceRow extends RowDataPacket {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: ResourceStatus;
}

export interface RequestRow extends RowDataPacket {
  reqid: number;
  requesterid: string;
  RequesterAssignmentId: number;
  resid: string;
  purpose: string | null;
  reqtime: Date;
  starttime: Date;
  endtime: Date;
  reqstatus: RequestStatus;
}

export interface ApprovalHierarchyRow extends RowDataPacket {
  hid: string;
  hlevel: number;
  resid: string;
  RoleId: string;
  ScopeId: string;
}

export interface ApprovalStepRow extends RowDataPacket {
  hid: string;
  reqid: number;
  approverid: string;
  ActionByUserId: string | null;
  ActionAsAssignmentId: number | null;
  issuetime: Date;
  actiontime: Date | null;
  shortcomment: string | null;
  approvalstatus: ApprovalStatus;
}

export interface AllocationRow extends RowDataPacket {
  allocationid: number;
  reqid: number;
  allocationstatus: AllocationStatus;
}
