import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { can, Permission } from "@/lib/permissions";
import { NewSessionForm } from "@/components/sessions/new-session-form";

export default async function NewSessionPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";

  const canCreateAny = can(role, Permission.SESSION_CREATE_ANY);
  const canCreateParty = can(role, Permission.SESSION_CREATE_PARTY);

  if (!canCreateAny && !canCreateParty) redirect("/sessions");

  let members;

  if (canCreateAny) {
    // MC: all active non-GOD users grouped
    members = await db.user.findMany({
      where: { isActive: true, role: { not: "GOD" } },
      select: {
        id: true,
        displayName: true,
        role: true,
        party: { select: { id: true, name: true } },
      },
      orderBy: { displayName: "asc" },
    });
  } else {
    // PC: only own party members
    const myParty = await db.party.findUnique({
      where: { coordinatorId: userId },
      select: { id: true },
    });
    members = myParty
      ? await db.user.findMany({
          where: { isActive: true, partyId: myParty.id },
          select: {
            id: true,
            displayName: true,
            role: true,
            party: { select: { id: true, name: true } },
          },
          orderBy: { displayName: "asc" },
        })
      : [];
  }

  const kalaams = await db.kalaam.findMany({
    select: { id: true, title: true, category: true },
    orderBy: { title: "asc" },
  });

  // Flatten for the existing NewSessionForm interface
  const reciters = members.map((m) => ({ id: m.id, displayName: m.displayName, role: m.role }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Session</h1>
      <NewSessionForm reciters={reciters} kalaams={kalaams} />
    </div>
  );
}

