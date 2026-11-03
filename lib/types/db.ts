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
  department: string | null;
  role: string | null;
  phno: string | null;
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
  approverid: string;
  resid: string;
}

export interface ApprovalStepRow extends RowDataPacket {
  hid: string;
  reqid: number;
  approverid: string;
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

