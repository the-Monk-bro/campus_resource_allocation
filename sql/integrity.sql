USE campus_resource_allocation;

DROP EVENT IF EXISTS evt_auto_complete_allocations;
DROP PROCEDURE IF EXISTS sp_update_allocation_statuses;
DROP TRIGGER IF EXISTS trg_prevent_allocation_overlap;
DROP FUNCTION IF EXISTS fn_check_resource_availability;
DROP FUNCTION IF EXISTS fn_is_user_authorized_for_step;

DELIMITER $$

-- Function 1: returns 1 if the resource is free for the time range, 0 if not
CREATE FUNCTION fn_check_resource_availability(
  p_resid VARCHAR(100),
  p_starttime DATETIME,
  p_endtime DATETIME
)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE v_count INT;

  SELECT COUNT(*) INTO v_count
  FROM allocations a
  JOIN requests r ON r.reqid = a.reqid
  WHERE r.resid = p_resid
    AND a.allocationstatus IN ('SCHEDULED', 'ONGOING')
    AND r.starttime < p_endtime
    AND r.endtime > p_starttime;

  RETURN v_count = 0;
END$$

-- Trigger: blocks a double booking before the row is inserted
CREATE TRIGGER trg_prevent_allocation_overlap
BEFORE INSERT ON allocations
FOR EACH ROW
BEGIN
  DECLARE v_resid VARCHAR(100);
  DECLARE v_start DATETIME;
  DECLARE v_end DATETIME;

  IF NEW.allocationstatus IN ('SCHEDULED', 'ONGOING') THEN
    SELECT resid, starttime, endtime
      INTO v_resid, v_start, v_end
    FROM requests
    WHERE reqid = NEW.reqid;

    IF NOT fn_check_resource_availability(v_resid, v_start, v_end) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Resource already allocated for this time slot';
    END IF;
  END IF;
END$$

-- Function 2: returns 1 if the user holds a currently valid role for this approval step
CREATE FUNCTION fn_is_user_authorized_for_step(
  p_user_id VARCHAR(255),
  p_hid VARCHAR(20)
)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
  DECLARE v_count INT;

  SELECT COUNT(*) INTO v_count
  FROM approval_hierarchies h
  JOIN role_assignments ra
    ON ra.RoleId = h.RoleId AND (h.ScopeId IS NULL OR ra.ScopeId = h.ScopeId)
  WHERE h.hid = p_hid
    AND ra.UserId = p_user_id
    AND ra.ValidFrom <= NOW()
    AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW());

  RETURN v_count > 0;
END$$

-- Procedure: updates allocation lifecycle (SCHEDULED -> ONGOING -> COMPLETED)
CREATE PROCEDURE sp_update_allocation_statuses()
BEGIN
  -- 1. Advance SCHEDULED -> ONGOING when start time has arrived
  UPDATE allocations a
  JOIN requests r ON r.reqid = a.reqid
  SET a.allocationstatus = 'ONGOING'
  WHERE a.allocationstatus = 'SCHEDULED'
    AND r.starttime <= NOW()
    AND r.endtime > NOW();

  -- 2. Advance ONGOING / SCHEDULED -> COMPLETED when end time has passed
  UPDATE allocations a
  JOIN requests r ON r.reqid = a.reqid
  SET a.allocationstatus = 'COMPLETED'
  WHERE a.allocationstatus IN ('SCHEDULED', 'ONGOING')
    AND r.endtime <= NOW();
END$$

DELIMITER ;

-- Event: runs the status updater every 15 minutes
CREATE EVENT IF NOT EXISTS evt_auto_complete_allocations
ON SCHEDULE EVERY 15 MINUTE
DO CALL sp_update_allocation_statuses();
