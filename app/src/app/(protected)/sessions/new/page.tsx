import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { NewSessionForm } from "@/components/sessions/new-session-form";

export default async function NewSessionPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "GOD") redirect("/kalaams");

  const [members, kalaams] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, role: { not: "GOD" } },
      select: { id: true, displayName: true, role: true },
      orderBy: { displayName: "asc" },
    }),
    db.kalaam.findMany({
      select: { id: true, title: true, category: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Session</h1>
      <NewSessionForm reciters={members} kalaams={kalaams} />
    </div>
  );
}
