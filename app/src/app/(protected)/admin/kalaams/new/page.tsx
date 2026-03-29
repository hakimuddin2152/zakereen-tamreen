import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AddKalaamForm } from "@/components/admin/add-kalaam-form";

export default async function AddKalaamPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "GOD") redirect("/kalaams");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-6">Add Kalaam</h1>
      <div className="bg-card border border-border rounded-lg p-6">
        <AddKalaamForm />
      </div>
    </div>
  );
}
