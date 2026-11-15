-- ============================================================================
-- Campus Resource Allocation System (CRAS)
-- Person 4: Analytical, Operational, and Governance Views
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

USE campus_resource_allocation;

-- ----------------------------------------------------------------------------
-- 1. View: vw_active_role_assignments
-- Purpose: Filters currently valid, active user role assignments.
--          Eliminates redundant temporal checking across the application.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_active_role_assignments;
CREATE OR REPLACE VIEW vw_active_role_assignment AS
SELECT
  ra.AssignmentId,
  ra.UserId,
  u.name AS UserName,
  u.email AS UserEmail,
  u.phno AS UserPhone,
  ra.RoleId,
  r.RoleName,
  ra.ScopeId,
  s.ScopeName,
  s.ScopeType,
  ra.ValidFrom,
  ra.ValidUntil,
  TRUE AS IsActive
FROM role_assignments ra
INNER JOIN users u ON u.id = ra.UserId
INNER JOIN roles r ON r.RoleId = ra.RoleId
INNER JOIN scopes s ON s.ScopeId = ra.ScopeId
WHERE ra.ValidFrom <= NOW()
  AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW());

-- ----------------------------------------------------------------------------
-- 2. View: vw_resource_utilization
-- Purpose: Aggregates resource booking metrics, capacity utilization,
--          and total duration booked for administrator reporting.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_resource_utilization;
CREATE OR REPLACE VIEW vw_resource_utilization AS
SELECT
  res.id AS ResourceId,
  res.name AS ResourceName,
  res.type AS ResourceType,
  res.capacity AS Capacity,
  res.location AS Location,
  res.status AS ResourceStatus,
  COUNT(DISTINCT r.reqid) AS TotalRequests,
  COUNT(DISTINCT CASE WHEN r.reqstatus = 'PENDING' THEN r.reqid END) AS PendingRequests,
  COUNT(DISTINCT CASE WHEN r.reqstatus = 'APPROVED' THEN r.reqid END) AS ApprovedRequests,
  COUNT(DISTINCT CASE WHEN r.reqstatus = 'REJECTED' THEN r.reqid END) AS RejectedRequests,
  COUNT(DISTINCT CASE WHEN r.reqstatus = 'CANCELLED' THEN r.reqid END) AS CancelledRequests,
  COUNT(DISTINCT CASE WHEN a.allocationstatus = 'SCHEDULED' THEN a.allocationid END) AS ScheduledAllocations,
  COUNT(DISTINCT CASE WHEN a.allocationstatus = 'ONGOING' THEN a.allocationid END) AS OngoingAllocations,
  COUNT(DISTINCT CASE WHEN a.allocationstatus = 'COMPLETED' THEN a.allocationid END) AS CompletedAllocations,
  COUNT(DISTINCT CASE WHEN a.allocationstatus IN ('SCHEDULED', 'ONGOING') THEN a.allocationid END) AS ActiveAllocations,
  ROUND(
    COALESCE(
      SUM(
        CASE
          WHEN a.allocationid IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, r.starttime, r.endtime) / 60.0
          ELSE 0
        END
      ),
      0
    ),
    2
  ) AS TotalBookedHours,
  ROUND(
    COALESCE(
      AVG(
        CASE
          WHEN a.allocationid IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, r.starttime, r.endtime) / 60.0
          ELSE NULL
        END
      ),
      0
    ),
    2
  ) AS AvgBookingHours
FROM resources res
LEFT JOIN requests r ON r.resid = res.id
LEFT JOIN allocations a ON a.reqid = r.reqid
GROUP BY
  res.id,
  res.name,
  res.type,
  res.capacity,
  res.location,
  res.status;

-- ----------------------------------------------------------------------------
-- 3. View: vw_request_pipeline
-- Purpose: Pre-joins requests with requester profile, role, scope, facility,
--          and confirmed allocation status for unified dashboard queries.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_request_pipeline;
CREATE OR REPLACE VIEW vw_request_pipeline AS
SELECT
  r.reqid AS RequestId,
  r.purpose AS Purpose,
  r.reqtime AS RequestTime,
  r.starttime AS StartTime,
  r.endtime AS EndTime,
  ROUND(TIMESTAMPDIFF(MINUTE, r.starttime, r.endtime) / 60.0, 2) AS DurationHours,
  r.reqstatus AS RequestStatus,
  -- Requester Information
  u.id AS RequesterId,
  u.name AS RequesterName,
  u.email AS RequesterEmail,
  u.phno AS RequesterPhone,
  -- Requester Role & Scope
  ra.AssignmentId AS RequesterAssignmentId,
  ro.RoleId AS RequesterRoleId,
  ro.RoleName AS RequesterRoleName,
  sc.ScopeId AS RequesterScopeId,
  sc.ScopeName AS RequesterScopeName,
  sc.ScopeType AS RequesterScopeType,
  -- Resource Information
  res.id AS ResourceId,
  res.name AS ResourceName,
  res.type AS ResourceType,
  res.capacity AS ResourceCapacity,
  res.location AS ResourceLocation,
  res.status AS ResourceCurrentStatus,
  -- Confirmed Allocation Details
  a.allocationid AS AllocationId,
  a.allocationstatus AS AllocationStatus
FROM requests r
INNER JOIN users u ON u.id = r.requesterid
INNER JOIN resources res ON res.id = r.resid
LEFT JOIN role_assignments ra ON ra.AssignmentId = r.RequesterAssignmentId
LEFT JOIN roles ro ON ro.RoleId = ra.RoleId
LEFT JOIN scopes sc ON sc.ScopeId = ra.ScopeId
LEFT JOIN allocations a ON a.reqid = r.reqid;

-- ----------------------------------------------------------------------------
-- 4. View: vw_approval_pipeline_audit
-- Purpose: Complete step-by-step audit projection across all requests,
--          showing required approval hierarchy levels, approver assignments,
--          actions taken, and decision turnaround times.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_approval_pipeline_audit;
CREATE OR REPLACE VIEW vw_approval_pipeline_audit AS
SELECT
  s.reqid AS RequestId,
  r.purpose AS Purpose,
  r.starttime AS StartTime,
  r.endtime AS EndTime,
  r.reqstatus AS RequestOverallStatus,
  -- Requester Info
  req_u.name AS RequesterName,
  req_u.email AS RequesterEmail,
  -- Resource Info
  res.id AS ResourceId,
  res.name AS ResourceName,
  -- Step Hierarchy Details
  ah.hid AS HierarchyId,
  ah.hlevel AS HierarchyLevel,
  req_role.RoleId AS RequiredRoleId,
  req_role.RoleName AS RequiredRoleName,
  ah.ScopeId AS RequiredScopeId,
  COALESCE(req_scope.ScopeName, 'Global') AS RequiredScopeName,
  -- Step Execution Details
  s.approvalstatus AS StepStatus,
  s.issuetime AS StepIssuedTime,
  s.actiontime AS StepActionTime,
  TIMESTAMPDIFF(MINUTE, s.issuetime, s.actiontime) AS TurnaroundMinutes,
  s.shortcomment AS ApproverComment,
  -- Approver Information
  act_u.id AS ActionByUserId,
  act_u.name AS ActionByUserName,
  act_u.email AS ActionByUserEmail,
  act_ro.RoleName AS ActionAsRoleName,
  act_sc.ScopeName AS ActionAsScopeName
FROM approval_steps s
INNER JOIN requests r ON r.reqid = s.reqid
INNER JOIN resources res ON res.id = r.resid
INNER JOIN users req_u ON req_u.id = r.requesterid
INNER JOIN approval_hierarchies ah ON ah.hid = s.hid
INNER JOIN roles req_role ON req_role.RoleId = ah.RoleId
LEFT JOIN scopes req_scope ON req_scope.ScopeId = ah.ScopeId
LEFT JOIN users act_u ON act_u.id = s.ActionByUserId
LEFT JOIN role_assignments act_ra ON act_ra.AssignmentId = s.ActionAsAssignmentId
LEFT JOIN roles act_ro ON act_ro.RoleId = act_ra.RoleId
LEFT JOIN scopes act_sc ON act_sc.ScopeId = act_ra.ScopeId;

-- ----------------------------------------------------------------------------
-- 5. View: vw_pending_approvals
-- Purpose: Real-time operational worklist of pending approval steps
--          for approvers and administrative dispatchers.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_pending_approvals;
CREATE OR REPLACE VIEW vw_pending_approvals AS
SELECT
  s.hid AS StepHierarchyId,
  s.reqid AS RequestId,
  ah.hlevel AS HierarchyLevel,
  ah.RoleId AS RequiredRoleId,
  r_role.RoleName AS RequiredRoleName,
  ah.ScopeId AS RequiredScopeId,
  COALESCE(r_scope.ScopeName, 'Global') AS RequiredScopeName,
  u.id AS RequesterId,
  u.name AS RequesterName,
  u.email AS RequesterEmail,
  res.id AS ResourceId,
  res.name AS ResourceName,
  res.location AS ResourceLocation,
  r.purpose AS Purpose,
  r.starttime AS BookingStartTime,
  r.endtime AS BookingEndTime,
  s.issuetime AS StepIssuedTime,
  ROUND(TIMESTAMPDIFF(MINUTE, s.issuetime, NOW()) / 60.0, 1) AS PendingHours
FROM approval_steps s
INNER JOIN requests r ON r.reqid = s.reqid
INNER JOIN approval_hierarchies ah ON ah.hid = s.hid
INNER JOIN roles r_role ON r_role.RoleId = ah.RoleId
LEFT JOIN scopes r_scope ON r_scope.ScopeId = ah.ScopeId
INNER JOIN users u ON u.id = r.requesterid
INNER JOIN resources res ON res.id = r.resid
WHERE s.approvalstatus = 'PENDING'
  AND r.reqstatus = 'PENDING';

-- ----------------------------------------------------------------------------
-- 6. View: vw_confirmed_allocations
-- Purpose: Flattened view of confirmed bookings and facility allocations,
--          with dynamic temporal indicators (Ongoing, Upcoming, HasEnded).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_confirmed_allocations;
CREATE OR REPLACE VIEW vw_confirmed_allocations AS
SELECT
  a.allocationid AS AllocationId,
  a.allocationstatus AS AllocationStatus,
  r.reqid AS RequestId,
  r.purpose AS Purpose,
  r.starttime AS StartTime,
  r.endtime AS EndTime,
  ROUND(TIMESTAMPDIFF(MINUTE, r.starttime, r.endtime) / 60.0, 2) AS DurationHours,
  -- Resource
  res.id AS ResourceId,
  res.name AS ResourceName,
  res.type AS ResourceType,
  res.location AS ResourceLocation,
  res.capacity AS ResourceCapacity,
  -- Requester
  u.id AS RequesterId,
  u.name AS RequesterName,
  u.email AS RequesterEmail,
  u.phno AS RequesterPhone,
  ro.RoleName AS RequesterRole,
  sc.ScopeName AS RequesterScope,
  -- Dynamic Real-Time Status Indicators
  CASE
    WHEN NOW() >= r.starttime AND NOW() < r.endtime THEN TRUE
    ELSE FALSE
  END AS IsCurrentlyOngoing,
  CASE
    WHEN NOW() < r.starttime THEN TRUE
    ELSE FALSE
  END AS IsUpcoming,
  CASE
    WHEN NOW() >= r.endtime THEN TRUE
    ELSE FALSE
  END AS HasEnded
FROM allocations a
INNER JOIN requests r ON r.reqid = a.reqid
INNER JOIN resources res ON res.id = r.resid
INNER JOIN users u ON u.id = r.requesterid
LEFT JOIN role_assignments ra ON ra.AssignmentId = r.RequesterAssignmentId
LEFT JOIN roles ro ON ro.RoleId = ra.RoleId
LEFT JOIN scopes sc ON sc.ScopeId = ra.ScopeId;
