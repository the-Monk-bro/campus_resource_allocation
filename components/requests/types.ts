export interface ResourceItem {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
}

export interface ApprovalStepDetail {
  hid: string;
  hlevel: number;
  approverid: string;
  approverName: string | null;
  approverEmail: string | null;
  approvalstatus: "PENDING" | "APPROVED" | "REJECTED";
  issuetime: string;
  actiontime: string | null;
  shortcomment: string | null;
}

export interface RequestRecord {
  reqid: number;
  requesterid: string;
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
