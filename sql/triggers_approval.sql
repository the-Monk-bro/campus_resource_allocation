DROP TRIGGER IF EXISTS trg_prevent_tampering_finalized;
DELIMITER $$
CREATE TRIGGER trg_prevent_tampering_finalized
BEFORE UPDATE ON approval_steps
FOR EACH ROW
BEGIN
    DECLARE v_parent_status VARCHAR(20);
    -- Fetch current status of parent request
    SELECT reqstatus INTO v_parent_status
    FROM requests
    WHERE reqid = NEW.reqid;
    -- Block updates if parent request is already finalized
    IF v_parent_status IN ('APPROVED', 'REJECTED', 'CANCELLED') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Workflow Violation: Cannot modify approval steps for a finalized or cancelled request.';
    END IF;
END$$
DELIMITER ;



DROP TRIGGER IF EXISTS trg_enforce_sequential_approval;
DELIMITER $$
CREATE TRIGGER trg_enforce_sequential_approval
BEFORE UPDATE ON approval_steps
FOR EACH ROW
BEGIN
    DECLARE v_current_level INT;
    DECLARE v_lower_pending_count INT DEFAULT 0;
    -- Only enforce when transitioning a step to APPROVED
    IF NEW.approvalstatus = 'APPROVED' AND OLD.approvalstatus = 'PENDING' THEN
        -- Get current step's hierarchy level
        SELECT hlevel INTO v_current_level
        FROM approval_hierarchies
        WHERE hid = NEW.hid;
        -- Count any earlier levels that are NOT yet APPROVED
        SELECT COUNT(*) INTO v_lower_pending_count
        FROM approval_steps ast
        INNER JOIN approval_hierarchies ah ON ast.hid = ah.hid
        WHERE ast.reqid = NEW.reqid
          AND ah.hlevel < v_current_level
          AND ast.approvalstatus != 'APPROVED';
        IF v_lower_pending_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Hierarchy Violation: Earlier approval levels must be approved before this step.';
        END IF;
    END IF;
END$$
DELIMITER ;



DROP TRIGGER IF EXISTS trg_approval_step_after_update;
DELIMITER $$
CREATE TRIGGER trg_approval_step_after_update
AFTER UPDATE ON approval_steps
FOR EACH ROW
BEGIN
    DECLARE v_remaining_steps INT DEFAULT 0;
    -- CASE 1: Single Step Rejection -> Instant Request Rejection
    IF NEW.approvalstatus = 'REJECTED' AND OLD.approvalstatus != 'REJECTED' THEN
        UPDATE requests
        SET reqstatus = 'REJECTED'
        WHERE reqid = NEW.reqid;
    -- CASE 2: Step Approved -> Check if this was the final required step
    ELSEIF NEW.approvalstatus = 'APPROVED' AND OLD.approvalstatus != 'APPROVED' THEN
        -- Check if any step for this request is still NOT approved
        SELECT COUNT(*) INTO v_remaining_steps
        FROM approval_steps
        WHERE reqid = NEW.reqid
          AND approvalstatus != 'APPROVED';
        -- If zero remaining, all levels are satisfied!
        IF v_remaining_steps = 0 THEN
            -- 1. Mark request as APPROVED
            UPDATE requests
            SET reqstatus = 'APPROVED'
            WHERE reqid = NEW.reqid;
            -- 2. Automatically create the confirmed allocation record
            INSERT INTO allocations (reqid, allocationstatus)
            VALUES (NEW.reqid, 'SCHEDULED')
            ON DUPLICATE KEY UPDATE allocationstatus = 'SCHEDULED';
        END IF;
    END IF;
END$$
DELIMITER ;