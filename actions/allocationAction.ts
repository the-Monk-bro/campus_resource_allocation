
"use server";

import pool from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRow } from "@/lib/types/db";
import { revalidatePath } from "next/cache";

interface ProcedureOutputRow extends RowDataPacket {
    statusCode: string | null;
    statusMessage: string | null;
}

// Asks MySQL (function fn_check_resource_availability) whether a resource is
// free for the given time range. Only SCHEDULED and ONGOING allocations block a slot.
export async function checkResourceAvailabilityAction(
    resid: string,
    starttime: string | Date,
    endtime: string | Date
): Promise<{ success: true; available: boolean } | { success: false; error: string }> {
    try {
        if (!resid?.trim()) {
            return { success: false, error: "No resource specified." };
        }

        const startDate = new Date(starttime);
        const endDate = new Date(endtime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return { success: false, error: "Invalid date/time format provided." };
        }

        if (endDate <= startDate) {
            return { success: false, error: "End time must be strictly after start time." };
        }

        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT fn_check_resource_availability(?, ?, ?) AS available`,
            [resid.trim(), startDate, endDate]
        );

        return { success: true, available: Number(rows[0]?.available) === 1 };
    } catch (error: unknown) {
        console.error("Failed to check resource availability:", error);
        const message = error instanceof Error ? error.message : "Failed to check availability.";
        return { success: false, error: message };
    }
}

// Executes MySQL procedure sp_update_allocation_statuses to advance
// SCHEDULED -> ONGOING -> COMPLETED allocations based on wall-clock time.
export async function updateAllocationStatusesAction(): Promise<{ success: boolean; error?: string }> {
    try {
        await pool.query("CALL sp_update_allocation_statuses()");
        return { success: true };
    } catch (error: unknown) {
        console.error("Failed to update allocation statuses:", error);
        const message = error instanceof Error ? error.message : "Failed to update allocation statuses.";
        return { success: false, error: message };
    }
}

// Executes MySQL procedure sp_cancel_allocation to cancel a SCHEDULED allocation.
export async function cancelAllocationAction(
    allocationId: number
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: "Unauthorized. Please sign in to continue." };
        }

        const [userRows] = await pool.execute<UserRow[]>(
            `SELECT id FROM users WHERE email = ? LIMIT 1`,
            [session.user.email]
        );

        const currentUser = userRows[0];
        if (!currentUser) {
            return { success: false, error: "User profile not found." };
        }

        if (!allocationId || isNaN(Number(allocationId))) {
            return { success: false, error: "Invalid allocation ID specified." };
        }

        const conn = await pool.getConnection();
        try {
            await conn.query("SET @status_code = NULL, @status_msg = NULL");
            await conn.query(
                "CALL sp_cancel_allocation(?, ?, @status_code, @status_msg)",
                [Number(allocationId), currentUser.id]
            );

            const [rows] = await conn.query<ProcedureOutputRow[]>(
                "SELECT @status_code AS statusCode, @status_msg AS statusMessage"
            );

            const statusCode = rows[0]?.statusCode;
            const statusMessage = rows[0]?.statusMessage;

            if (statusCode !== "SUCCESS") {
                return {
                    success: false,
                    error: statusMessage || "Failed to cancel allocation.",
                };
            }

            revalidatePath("/dashboard/allocations");
            revalidatePath("/dashboard/requests");
            revalidatePath("/dashboard/facilities");
            revalidatePath("/admin/allocations");
            revalidatePath("/admin/requests");
            revalidatePath("/admin");

            return {
                success: true,
                message: statusMessage || "Allocation cancelled successfully.",
            };
        } finally {
            conn.release();
        }
    } catch (error: unknown) {
        console.error("Failed to cancel allocation:", error);
        const message = error instanceof Error ? error.message : "Failed to cancel allocation due to a server error.";
        return { success: false, error: message };
    }
}
