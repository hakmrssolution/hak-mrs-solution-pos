import { redirect } from "next/navigation";
import { getLicenseStatus } from "@/lib/license";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { active } = await getLicenseStatus();

  if (!active) {
    redirect("/settings/license");
  }

  return <>{children}</>;
}