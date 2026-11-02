import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyPendingApprovalsAction } from "@/actions/approvalActions";
import ApprovalsView from "@/components/approvals/ApprovalsView";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const result = await getMyPendingApprovalsAction();

  if (!result.success) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          Failed to load approvals: {result.error}
        </div>
      </div>
    );
  }

  return <ApprovalsView items={result.items} />;
}
