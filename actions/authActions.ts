"use server";

import db from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      if (existing.password) {
        return {
          success: false,
          error: "An account with this email already exists. Please log in instead.",
        };
      } else {
        // Linked Google user without password - allow them to set password
        await db
          .update(users)
          .set({
            password: hashedPassword,
            name: existing.name || name?.trim() || normalizedEmail.split("@")[0],
          })
          .where(eq(users.email, normalizedEmail));

        return { success: true, isNew: false };
      }
    }

    await db.insert(users).values({
      name: name?.trim() || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password: hashedPassword,
    });

    return { success: true, isNew: true };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, error: error.message || "Failed to register account." };
  }
}
