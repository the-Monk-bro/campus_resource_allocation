import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import SignOutButton from "@/components/signOutButton";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        redirect("/");
    }

    const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, session.user.email));

    const user = userList[0];

    const userName = user?.name ?? session.user.name ?? "User";
    const userEmail = user?.email ?? session.user.email;
    const userImage = user?.image ?? session.user.image;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto mt-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">My Profile</h1>
                <SignOutButton />
            </div>

            <div className="space-y-4">
                <p className="text-gray-700">
                    <span className="font-medium text-gray-600">Name:</span> {userName}
                </p>

                <p className="text-gray-700">
                    <span className="font-medium text-gray-600">Email:</span> {userEmail}
                </p>

                {userImage && (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-600 mb-2">Image:</span>
                        <Image
                            src={userImage}
                            alt="Profile"
                            className="rounded-lg max-w-full h-auto"
                            width={200}
                            height={200}
                            priority
                        />
                    </div>
                )}
            </div>
        </div>
    );
}