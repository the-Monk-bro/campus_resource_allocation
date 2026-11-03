"use server";

import pool from "@/lib/db";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const phno = (formData.get("phno") as string)?.trim();

  // Validate phone number length (exactly 10 digits)
  if (!phno || phno.length !== 10 || !/^\d{10}$/.test(phno)) {
    throw new Error("Phone number must be exactly 10 digits.");
  }

  await pool.execute(
    `UPDATE users SET phno = ? WHERE email = ?`,
    [phno, session.user.email]
  );

  redirect("/dashboard/profile");
}
