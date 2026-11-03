"use server";

import pool from "@/lib/db";
import { UserRow } from "@/lib/types/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface RegisterInput {
  name?: string;
  email: string;
  password: string;
}

export async function registerUserAction(input: RegisterInput) {
  try {
    const { name, email, password } = input;

    if (!email?.trim() || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // Check if user already exists
    const [rows] = await pool.execute<UserRow[]>(
      `SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    const existing = rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      if (existing.password) {
        return {
          success: false,
          error: "An account with this email already exists. Please log in instead.",
        };
      } else {
        // Linked Google user without password - allow them to set password
        const updatedName = existing.name || name?.trim() || normalizedEmail.split("@")[0];
        await pool.execute(
          `UPDATE users SET password = ?, name = ? WHERE email = ?`,
          [hashedPassword, updatedName, normalizedEmail]
        );

        return { success: true, isNew: false };
      }
    }

    const id = crypto.randomUUID();
    const newName = name?.trim() || normalizedEmail.split("@")[0];

    await pool.execute(
      `INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
      [id, newName, normalizedEmail, hashedPassword]
    );

    return { success: true, isNew: true };
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "Failed to register account.";
    return { success: false, error: message };
  }
}
