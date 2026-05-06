import { getAdminUser } from "@/lib/auth";
import { AdminShell } from "./_components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();

  if (!user) {
    return <>{children}</>;
  }

  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
