DROP PROCEDURE IF EXISTS sp_process_approval_action;
DELIMITER $$
CREATE PROCEDURE sp_process_approval_action (
    IN  p_hid               VARCHAR(20),
    IN  p_reqid             INT,
    IN  p_user_id           VARCHAR(255),
    IN  p_action            VARCHAR(10),     -- 'APPROVE' or 'REJECT'
    IN  p_comment           VARCHAR(100),
    OUT p_status_code       VARCHAR(30),     -- 'SUCCESS', 'UNAUTHORIZED', 'INVALID_STATE', etc.
    OUT p_status_message    VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_assignment_id     INT;
    DECLARE v_current_status    VARCHAR(20);
    DECLARE v_req_status        VARCHAR(20);
    -- Error handler for unexpected database exceptions
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            p_status_message = MESSAGE_TEXT;
        SET p_status_code = 'SQL_ERROR';
        ROLLBACK;
    END;
    -- Validate action parameter
    IF p_action NOT IN ('APPROVE', 'REJECT') THEN
        SET p_status_code = 'INVALID_ARGUMENT';
        SET p_status_message = 'Action must be either APPROVE or REJECT.';
        LEAVE proc_label;
    END IF;
    -- Validate rejection comment requirement
    IF p_action = 'REJECT' AND (p_comment IS NULL OR TRIM(p_comment) = '') THEN
        SET p_status_code = 'COMMENT_REQUIRED';
        SET p_status_message = 'A comment is mandatory when rejecting a request.';
        LEAVE proc_label;
    END IF;
    START TRANSACTION;
    -- 1. Verify and lock the approval step row
    SELECT approvalstatus INTO v_current_status
    FROM approval_steps
    WHERE hid = p_hid AND reqid = p_reqid
    FOR UPDATE;
    IF v_current_status IS NULL THEN
        SET p_status_code = 'NOT_FOUND';
        SET p_status_message = 'Approval step not found for this request.';
        ROLLBACK;
        LEAVE proc_label;
    END IF;
    IF v_current_status != 'PENDING' THEN
        SET p_status_code = 'INVALID_STATE';
        SET p_status_message = CONCAT('This step has already been processed with status: ', v_current_status);
        ROLLBACK;
        LEAVE proc_label;
    END IF;
    -- 2. Verify that the user holds an active role assignment matching the required (RoleId, ScopeId)
    SELECT ra.AssignmentId INTO v_assignment_id
    FROM role_assignments ra
    INNER JOIN approval_hierarchies ah ON ah.RoleId = ra.RoleId AND (ah.ScopeId IS NULL OR ah.ScopeId = ra.ScopeId)
    WHERE ah.hid = p_hid
      AND ra.UserId = p_user_id
      AND ra.ValidFrom <= NOW()
      AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
    LIMIT 1;
    IF v_assignment_id IS NULL THEN
        SET p_status_code = 'UNAUTHORIZED';
        SET p_status_message = 'Unauthorized: You do not hold an active role assignment authorized to approve this step.';
        ROLLBACK;
        LEAVE proc_label;
    END IF;
    -- 3. Execute the step update.
    -- (This triggers trg_prevent_tampering_finalized, trg_enforce_sequential_approval,
    -- and trg_approval_step_after_update automatically!)
    UPDATE approval_steps
    SET approvalstatus        = IF(p_action = 'APPROVE', 'APPROVED', 'REJECTED'),
        actiontime            = NOW(),
        shortcomment          = TRIM(p_comment),
        ActionByUserId        = p_user_id,
        ActionAsAssignmentId  = v_assignment_id
    WHERE hid = p_hid AND reqid = p_reqid;
    COMMIT;
    SET p_status_code = 'SUCCESS';
    SET p_status_message = IF(p_action = 'APPROVE', 'Step approved successfully.', 'Request rejected.');
END$$
DELIMITER ;