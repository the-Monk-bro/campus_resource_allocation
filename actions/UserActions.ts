"use server";

import db from "@/db";
import { users } from "@/db/schema";
import { revalidatePath } from "next/cache";

export async function addUser(formData: FormData) {
  const customId = formData.get("id") as string;
  const name = formData.get("name") as string;
  const ageRaw = formData.get("age") as string;

  const age = ageRaw ? Number(ageRaw) : undefined;
  const id = customId?.trim() || `usr_${Date.now()}`;

  await db.insert(users).values({
    id,
    name: name || "Anonymous",
    age: age ?? 0,
  });

  revalidatePath("/");
}
