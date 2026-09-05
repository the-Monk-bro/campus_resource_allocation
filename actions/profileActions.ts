"use server";

import db from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const id = (formData.get("id") as string)?.trim();
  const department = (formData.get("department") as string)?.trim();
  const role = (formData.get("role") as string)?.trim();
  const phno = (formData.get("phno") as string)?.trim();

  // Validate all fields are non-empty
  if (!id || !department || !role || !phno) {
    throw new Error("All input fields are required.");
  }

  // Validate phone number length (exactly 10 digits)
  if (phno.length !== 10 || !/^\d{10}$/.test(phno)) {
    throw new Error("Phone number must be exactly 10 digits.");
  }

  await db
    .update(users)
    .set({
      id: id,
      department: department,
      role: role,
      phno: phno,
    })
    .where(eq(users.email, session.user.email));

  redirect("/profile");
}
