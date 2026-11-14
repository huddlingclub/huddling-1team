import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import AdminView from "@/components/admin-view";

export default async function AdminPage() {
  const store = await cookies();
  if (!isAdmin(store.get("ice_admin")?.value)) redirect("/");
  return <AdminView />;
}
