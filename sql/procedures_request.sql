
DELIMITER //

DROP PROCEDURE IF EXISTS sp_create_resource_request //

CREATE PROCEDURE sp_create_resource_request (
    IN  p_requester_id    VARCHAR(255),
    IN  p_assignment_id   INT,
    IN  p_resid           VARCHAR(100),
    IN  p_purpose         VARCHAR(100),
    IN  p_starttime       DATETIME,
    IN  p_endtime         DATETIME,
    OUT p_new_reqid       INT,
    OUT p_status_code     VARCHAR(30),
    OUT p_status_message  VARCHAR(255)
)
proc: BEGIN
    DECLARE v_res_status  VARCHAR(20) DEFAULT NULL;
    DECLARE v_assign_ok   INT DEFAULT 0;
    DECLARE v_conflicts   INT DEFAULT 0;
    DECLARE v_levels      INT DEFAULT 0;
    DECLARE v_unresolved  INT DEFAULT 0;
    DECLARE v_steps       INT DEFAULT 0;
    DECLARE v_reqid       INT DEFAULT NULL;
    DECLARE v_sqlstate    CHAR(5) DEFAULT '00000';
    DECLARE v_errno       INT DEFAULT 0;
    DECLARE v_msg         TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_sqlstate = RETURNED_SQLSTATE,
            v_errno    = MYSQL_ERRNO,
            v_msg      = MESSAGE_TEXT;

        ROLLBACK;
        SET p_new_reqid = NULL;

        IF v_errno = 1213 THEN
            SET p_status_code    = 'DEADLOCK';
            SET p_status_message = 'Deadlock detected; transaction rolled back. Safe to retry.';
        ELSEIF v_errno = 1205 THEN
            SET p_status_code    = 'LOCK_TIMEOUT';
            SET p_status_message = 'Timed out waiting for the resource lock. Safe to retry.';
        ELSE
            SET p_status_code    = 'ERROR';
            SET p_status_message = LEFT(CONCAT('DB error ', v_errno, ' [', v_sqlstate, ']: ', v_msg), 255);
        END IF;
    END;

    SET p_new_reqid = NULL;
    SET p_status_code = NULL;
    SET p_status_message = NULL;

    IF p_starttime IS NULL OR p_endtime IS NULL OR p_endtime <= p_starttime THEN
        SET p_status_code = 'INVALID_TIME';
        SET p_status_message = 'End time must be after start time.';
        LEAVE proc;
    END IF;

    SELECT COUNT(*) INTO v_assign_ok
      FROM role_assignments
     WHERE AssignmentId = p_assignment_id
       AND UserId       = p_requester_id
       AND ValidFrom   <= NOW()
       AND (ValidUntil IS NULL OR ValidUntil >= NOW());

    IF v_assign_ok = 0 THEN
        SET p_status_code = 'INVALID_ASSIGNMENT';
        SET p_status_message = 'You do not hold an active role assignment with this id.';
        LEAVE proc;
    END IF;

    START TRANSACTION;

    SELECT status INTO v_res_status
      FROM resources
     WHERE id = p_resid
       FOR UPDATE;

    IF v_res_status IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_status_message = 'Resource does not exist.';
        LEAVE proc;
    END IF;

    IF v_res_status <> 'AVAILABLE' THEN
        ROLLBACK;
        SET p_status_code = 'UNAVAILABLE';
        SET p_status_message = CONCAT('Resource is not available (status: ', v_res_status, ').');
        LEAVE proc;
    END IF;

    SELECT COUNT(*) INTO v_conflicts
      FROM requests r
     WHERE r.resid     = p_resid
       AND r.reqstatus IN ('PENDING', 'APPROVED')
       AND r.starttime < p_endtime
       AND r.endtime   > p_starttime;

    IF v_conflicts = 0 THEN
        SELECT COUNT(*) INTO v_conflicts
          FROM allocations a
          JOIN requests r ON r.reqid = a.reqid
         WHERE r.resid = p_resid
           AND a.allocationstatus IN ('SCHEDULED', 'ONGOING')
           AND r.starttime < p_endtime
           AND r.endtime   > p_starttime;
    END IF;

    IF v_conflicts > 0 THEN
        ROLLBACK;
        SET p_status_code = 'CONFLICT';
        SET p_status_message = 'The resource is already booked or has a pending request in that time window.';
        LEAVE proc;
    END IF;

    SELECT COUNT(*) INTO v_levels
      FROM approval_hierarchies
     WHERE resid = p_resid;

    IF v_levels = 0 THEN
        ROLLBACK;
        SET p_status_code = 'NO_HIERARCHY';
        SET p_status_message = 'No approval hierarchy is configured for this resource.';
        LEAVE proc;
    END IF;

    SELECT COUNT(*) INTO v_unresolved
      FROM approval_hierarchies h
     WHERE h.resid = p_resid
       AND NOT EXISTS (
            SELECT 1 FROM role_assignments ra
             WHERE ra.RoleId  = h.RoleId
               AND ra.ScopeId = h.ScopeId
               AND ra.ValidFrom <= NOW()
               AND (ra.ValidUntil IS NULL OR ra.ValidUntil >= NOW())
       );

    IF v_unresolved > 0 THEN
        ROLLBACK;
        SET p_status_code = 'NO_APPROVER';
        SET p_status_message = 'An approval level has no active approver assigned.';
        LEAVE proc;
    END IF;

    SAVEPOINT sp_before_request;

    INSERT INTO requests
        (requesterid, RequesterAssignmentId, resid, purpose, starttime, endtime)
    VALUES
        (p_requester_id, p_assignment_id, p_resid, p_purpose, p_starttime, p_endtime);

    SET v_reqid = LAST_INSERT_ID();

    INSERT INTO approval_steps (hid, reqid, approvalstatus, issuetime)
    SELECT h.hid, v_reqid, 'PENDING', NOW()
    FROM approval_hierarchies h
    WHERE h.resid = p_resid
    ORDER BY h.hlevel ASC;

    SET v_steps = ROW_COUNT();

    IF v_steps <> v_levels THEN
        ROLLBACK TO SAVEPOINT sp_before_request;
        ROLLBACK;
        SET p_status_code = 'INCOMPLETE_STEPS';
        SET p_status_message = 'Could not create all approval steps; nothing was saved.';
        LEAVE proc;
    END IF;

    COMMIT;

    SET p_new_reqid      = v_reqid;
    SET p_status_code    = 'SUCCESS';
    SET p_status_message = CONCAT('Request #', v_reqid, ' created with ', v_steps, ' approval step(s).');
END //

DROP PROCEDURE IF EXISTS sp_cancel_request //

CREATE PROCEDURE sp_cancel_request (
    IN  p_reqid           INT,
    IN  p_user_id         VARCHAR(255),
    OUT p_status_code     VARCHAR(30),
    OUT p_status_message  VARCHAR(255)
)
proc: BEGIN
    DECLARE v_requester  VARCHAR(255) DEFAULT NULL;
    DECLARE v_status     VARCHAR(20)  DEFAULT NULL;
    DECLARE v_sqlstate   CHAR(5) DEFAULT '00000';
    DECLARE v_errno      INT DEFAULT 0;
    DECLARE v_msg        TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            v_sqlstate = RETURNED_SQLSTATE,
            v_errno    = MYSQL_ERRNO,
            v_msg      = MESSAGE_TEXT;
        ROLLBACK;
        IF v_errno = 1213 THEN
            SET p_status_code    = 'DEADLOCK';
            SET p_status_message = 'Deadlock detected; transaction rolled back. Safe to retry.';
        ELSEIF v_errno = 1205 THEN
            SET p_status_code    = 'LOCK_TIMEOUT';
            SET p_status_message = 'Timed out waiting for a lock. Safe to retry.';
        ELSE
            SET p_status_code    = 'ERROR';
            SET p_status_message = LEFT(CONCAT('DB error ', v_errno, ' [', v_sqlstate, ']: ', v_msg), 255);
        END IF;
    END;

    SET p_status_code = NULL;
    SET p_status_message = NULL;

    START TRANSACTION;

    SELECT requesterid, reqstatus INTO v_requester, v_status
      FROM requests
     WHERE reqid = p_reqid
       FOR UPDATE;

    IF v_status IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'NOT_FOUND';
        SET p_status_message = 'Request does not exist.';
        LEAVE proc;
    END IF;

    IF v_requester <> p_user_id THEN
        ROLLBACK;
        SET p_status_code = 'FORBIDDEN';
        SET p_status_message = 'Only the requester can cancel this request.';
        LEAVE proc;
    END IF;

    IF v_status <> 'PENDING' THEN
        ROLLBACK;
        SET p_status_code = 'NOT_CANCELLABLE';
        SET p_status_message = CONCAT('Only PENDING requests can be cancelled (current status: ', v_status, ').');
        LEAVE proc;
    END IF;

    DELETE FROM approval_steps
     WHERE reqid = p_reqid
       AND approvalstatus = 'PENDING';

    UPDATE requests
       SET reqstatus = 'CANCELLED'
     WHERE reqid = p_reqid;

    COMMIT;

    SET p_status_code    = 'SUCCESS';
    SET p_status_message = CONCAT('Request #', p_reqid, ' cancelled.');
END //

DELIMITER ;
