import GoogleLoginButton from "@/components/googleSignInButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (session) {
        redirect("/profile");
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center p-4">
            <h1 className="text-4xl font-bold">Welcome to Campus Resource Allocation</h1>
            <GoogleLoginButton />
        </div>
    );
}