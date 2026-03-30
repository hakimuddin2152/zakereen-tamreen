import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, Permission } from "@/lib/permissions";
import { EvalRequestsTable } from "@/components/evaluations/eval-requests-table";

export default async function AdminEvalRequestsPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";

  const canReviewAny = can(role, Permission.EVAL_REQUEST_REVIEW_ANY);
  const canReviewParty = can(role, Permission.EVAL_REQUEST_REVIEW_PARTY);

  if (!canReviewAny && !canReviewParty) redirect("/kalaams");

  type RequestRow = {
    id: string;
    requestedAt: Date;
    status: string;
    notes: string | null;
    user: { id: string; displayName: string; username: string };
    kalaam: { id: string; title: string };
  };

  let requests: RequestRow[];

  if (canReviewAny) {
    // MC: all pending requests
    requests = await db.kalaamEvalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        kalaam: { select: { id: true, title: true } },
      },
    });
  } else {
    // PC: only their party's members
    const myParty = await db.party.findUnique({
      where: { coordinatorId: userId },
      select: { id: true },
    });

    if (!myParty) {
      requests = [];
    } else {
      requests = await db.kalaamEvalRequest.findMany({
        where: {
          status: "PENDING",
          user: { partyId: myParty.id },
        },
        orderBy: { requestedAt: "asc" },
        include: {
          user: { select: { id: true, displayName: true, username: true } },
          kalaam: { select: { id: true, title: true } },
        },
      });
    }
  }

  const formatted = requests.map((r) => ({
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    status: r.status,
    notes: r.notes,
    user: r.user,
    kalaam: r.kalaam,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pending Evaluations</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatted.length} pending request{formatted.length !== 1 ? "s" : ""}</p>
      </div>
      <EvalRequestsTable requests={formatted} />
    </div>
  );
}
