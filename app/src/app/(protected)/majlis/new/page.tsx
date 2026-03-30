import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can, Permission } from "@/lib/permissions";
import { NewMajlisForm } from "@/components/majlis/new-majlis-form";

export default async function NewMajlisPage() {
  const session = await auth();
  if (!can(session?.user?.role ?? "", Permission.MAJLIS_CREATE)) redirect("/majlis");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Majlis</h1>
      <NewMajlisForm />
    </div>
  );
}
