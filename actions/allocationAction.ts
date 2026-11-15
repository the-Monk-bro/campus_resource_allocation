
"use server";

import pool from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

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