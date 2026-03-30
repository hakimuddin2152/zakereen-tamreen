import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can, Permission } from "@/lib/permissions";
import { NewPartyForm } from "@/components/parties/new-party-form";

export default async function NewPartyPage() {
  const session = await auth();
  if (!can(session?.user?.role ?? "", Permission.PARTY_CREATE)) redirect("/kalaams");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Party</h1>
      <NewPartyForm />
    </div>
  );
}
