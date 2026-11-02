import AuthCard from "@/components/AuthCard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[90vh] py-12 px-4">
            <div className="mb-8 text-center max-w-lg">
                <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    Resource Management Portal
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                    Campus Resource Allocation
                </h1>
                <p className="text-sm sm:text-base text-slate-400">
                    Seamlessly reserve classrooms, labs, auditoriums, and campus equipment.
                </p>
            </div>

            <AuthCard />
        </div>
    );
}