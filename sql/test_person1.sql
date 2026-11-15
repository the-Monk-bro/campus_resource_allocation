-- ============================================================================
-- Person 1 manual tests. Replace the placeholders with real ids from your
-- seeded data (npm run db:reset):
--   @u   = a users.id          @asg = that user's role_assignments.AssignmentId
--   @res = a resources.id that has approval_hierarchies rows
-- ============================================================================
SET @u = 'usr-student-01';
SET @asg = 9;
SET @res = 'LH-101';

-- ---- Test 1: happy path ----------------------------------------------------
CALL sp_create_resource_request(@u, @asg, @res, 'Demo booking',
     '2027-01-10 10:00:00', '2027-01-10 12:00:00', @rid, @code, @msg);
SELECT @rid AS reqid, @code AS code, @msg AS msg;            -- expect SUCCESS
SELECT * FROM requests WHERE reqid = @rid;                    -- 1 PENDING row
SELECT * FROM approval_steps WHERE reqid = @rid;              -- 1 PENDING row per level

-- ---- Test 2: conflict => nothing written (atomicity / rollback demo) -------
SELECT COUNT(*) AS requests_before FROM requests;
CALL sp_create_resource_request(@u, @asg, @res, 'Overlap',
     '2027-01-10 11:00:00', '2027-01-10 13:00:00', @rid2, @code2, @msg2);
SELECT @rid2 AS reqid, @code2 AS code, @msg2 AS msg;          -- expect CONFLICT, reqid NULL
SELECT COUNT(*) AS requests_after FROM requests;              -- same number as before

-- Back-to-back is allowed (strict inequalities)
CALL sp_create_resource_request(@u, @asg, @res, 'Back to back',
     '2027-01-10 12:00:00', '2027-01-10 14:00:00', @rid3, @code3, @msg3);
SELECT @rid3, @code3;                                         -- expect SUCCESS

-- ---- Test 3: invalid time --------------------------------------------------
CALL sp_create_resource_request(@u, @asg, @res, 'Bad time',
     '2027-01-10 15:00:00', '2027-01-10 14:00:00', @rid4, @code4, @msg4);
SELECT @code4;                                                -- expect INVALID_TIME

-- ---- Test 4: cancel --------------------------------------------------------
CALL sp_cancel_request(@rid, @u, @c, @m);
SELECT @c, @m;                                                -- expect SUCCESS
SELECT reqstatus FROM requests WHERE reqid = @rid;            -- CANCELLED
SELECT COUNT(*) AS pending_steps_left FROM approval_steps WHERE reqid = @rid AND approvalstatus = 'PENDING';  -- 0
CALL sp_cancel_request(@rid, @u, @c, @m);
SELECT @c;                                                    -- NOT_CANCELLABLE


