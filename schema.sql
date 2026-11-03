-- ============================================================================
-- Campus Resource Allocation - MySQL Database Schema
-- Role & Scope-Based Architecture (No ORM, mysql2 compatible)
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `campus_resource_allocation`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `campus_resource_allocation`;

-- ----------------------------------------------------------------------------
-- 1. Table: users (No role, no department)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `emailVerified` DATETIME NULL DEFAULT NULL,
  `image` TEXT NULL DEFAULT NULL,
  `password` VARCHAR(255) NULL DEFAULT NULL,
  `phno` VARCHAR(10) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: roles (Generic role definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `RoleId` VARCHAR(100) NOT NULL,
  `RoleName` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`RoleId`),
  UNIQUE KEY `roles_rolename_unique` (`RoleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: scopes (Entities over which roles exist)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scopes` (
  `ScopeId` VARCHAR(100) NOT NULL,
  `ScopeName` VARCHAR(255) NOT NULL,
  `ScopeType` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`ScopeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: role_assignments (User-Role-Scope mappings with temporal validity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_assignments` (
  `AssignmentId` INT NOT NULL AUTO_INCREMENT,
  `UserId` VARCHAR(255) NOT NULL,
  `RoleId` VARCHAR(100) NOT NULL,
  `ScopeId` VARCHAR(100) NOT NULL,
  `ValidFrom` DATETIME NOT NULL,
  `ValidUntil` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`AssignmentId`),
  KEY `role_assignments_userid_idx` (`UserId`),
  KEY `role_assignments_role_scope_idx` (`RoleId`, `ScopeId`),
  CONSTRAINT `fk_role_assignments_user`
    FOREIGN KEY (`UserId`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_assignments_role`
    FOREIGN KEY (`RoleId`) REFERENCES `roles` (`RoleId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_role_assignments_scope`
    FOREIGN KEY (`ScopeId`) REFERENCES `scopes` (`ScopeId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_assignment_validity`
    CHECK (`ValidUntil` IS NULL OR `ValidUntil` >= `ValidFrom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: account (NextAuth OAuth Accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `account` (
  `userId` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(255) NOT NULL,
  `providerAccountId` VARCHAR(255) NOT NULL,
  `refresh_token` TEXT NULL DEFAULT NULL,
  `access_token` TEXT NULL DEFAULT NULL,
  `expires_at` INT NULL DEFAULT NULL,
  `token_type` VARCHAR(255) NULL DEFAULT NULL,
  `scope` VARCHAR(255) NULL DEFAULT NULL,
  `id_token` TEXT NULL DEFAULT NULL,
  `session_state` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`provider`, `providerAccountId`),
  KEY `account_userId_idx` (`userId`),
  CONSTRAINT `fk_account_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: session (NextAuth Database Sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `session` (
  `sessionToken` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `expires` DATETIME NOT NULL,
  PRIMARY KEY (`sessionToken`),
  KEY `session_userId_idx` (`userId`),
  CONSTRAINT `fk_session_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Table: verificationToken (NextAuth Email Verification Tokens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `verificationToken` (
  `identifier` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `expires` DATETIME NOT NULL,
  PRIMARY KEY (`identifier`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Table: resources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resources` (
  `id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NULL DEFAULT NULL,
  `capacity` INT NULL DEFAULT NULL,
  `location` VARCHAR(50) NULL DEFAULT NULL,
  `status` ENUM('AVAILABLE', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_resource_capacity` CHECK (`capacity` IS NULL OR `capacity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Table: requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `requests` (
  `reqid` INT NOT NULL AUTO_INCREMENT,
  `requesterid` VARCHAR(255) NOT NULL,
  `RequesterAssignmentId` INT NOT NULL,
  `resid` VARCHAR(100) NOT NULL,
  `purpose` VARCHAR(100) NULL DEFAULT NULL,
  `reqtime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `starttime` DATETIME NOT NULL,
  `endtime` DATETIME NOT NULL,
  `reqstatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`reqid`),
  KEY `requests_requesterid_idx` (`requesterid`),
  KEY `requests_resid_idx` (`resid`),
  KEY `requests_requester_assignment_idx` (`RequesterAssignmentId`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`requesterid`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_assignment`
    FOREIGN KEY (`RequesterAssignmentId`) REFERENCES `role_assignments` (`AssignmentId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_resource`
    FOREIGN KEY (`resid`) REFERENCES `resources` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_req_time` CHECK (`endtime` > `starttime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Table: approval_hierarchies (Defined by RoleId and ScopeId)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `approval_hierarchies` (
  `hid` VARCHAR(20) NOT NULL,
  `hlevel` SMALLINT NOT NULL DEFAULT 1,
  `resid` VARCHAR(100) NOT NULL,
  `RoleId` VARCHAR(100) NOT NULL,
  `ScopeId` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`hid`),
  UNIQUE KEY `unique_res_level` (`resid`, `hlevel`),
  KEY `approval_hierarchies_role_idx` (`RoleId`),
  KEY `approval_hierarchies_scope_idx` (`ScopeId`),
  CONSTRAINT `fk_hierarchies_resource`
    FOREIGN KEY (`resid`) REFERENCES `resources` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hierarchies_role`
    FOREIGN KEY (`RoleId`) REFERENCES `roles` (`RoleId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hierarchies_scope`
    FOREIGN KEY (`ScopeId`) REFERENCES `scopes` (`ScopeId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_hlevel` CHECK (`hlevel` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Table: approval_steps
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `approval_steps` (
  `hid` VARCHAR(20) NOT NULL,
  `reqid` INT NOT NULL,
  `approverid` VARCHAR(255) NOT NULL,
  `ActionByUserId` VARCHAR(255) NULL DEFAULT NULL,
  `ActionAsAssignmentId` INT NULL DEFAULT NULL,
  `issuetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actiontime` DATETIME NULL DEFAULT NULL,
  `shortcomment` VARCHAR(100) NULL DEFAULT NULL,
  `approvalstatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`hid`, `reqid`),
  KEY `approval_steps_reqid_idx` (`reqid`),
  KEY `approval_steps_approverid_idx` (`approverid`),
  KEY `approval_steps_actionby_idx` (`ActionByUserId`),
  KEY `approval_steps_actionas_idx` (`ActionAsAssignmentId`),
  CONSTRAINT `fk_steps_hierarchy`
    FOREIGN KEY (`hid`) REFERENCES `approval_hierarchies` (`hid`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_steps_request`
    FOREIGN KEY (`reqid`) REFERENCES `requests` (`reqid`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_steps_approver`
    FOREIGN KEY (`approverid`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_steps_actionby`
    FOREIGN KEY (`ActionByUserId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_steps_actionas`
    FOREIGN KEY (`ActionAsAssignmentId`) REFERENCES `role_assignments` (`AssignmentId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_actiontime`
    CHECK (`actiontime` IS NULL OR `actiontime` >= `issuetime`),
  CONSTRAINT `chk_approvalstatus_actiontime`
    CHECK (`approvalstatus` = 'PENDING' OR `actiontime` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Table: allocations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `allocations` (
  `allocationid` INT NOT NULL AUTO_INCREMENT,
  `reqid` INT NOT NULL,
  `allocationstatus` ENUM('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  PRIMARY KEY (`allocationid`),
  UNIQUE KEY `unique_allocation_reqid` (`reqid`),
  CONSTRAINT `fk_allocations_request`
    FOREIGN KEY (`reqid`) REFERENCES `requests` (`reqid`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
