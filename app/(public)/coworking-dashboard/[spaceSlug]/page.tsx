import CoworkingDashboard from "@/lib/components/coworking-dashboard/CoworkingDashboard";
import { redirect } from "next/navigation";

export default async function CoworkingDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceSlug: string }>;
  searchParams: Promise<{ stripe?: string }>;
}) {
  const { spaceSlug } = await params;
  const { stripe } = await searchParams;

  if (stripe === "complete" || stripe === "refresh") {
    return <CoworkingDashboard spaceSlug={spaceSlug} activeTab="payment" />;
  }

  redirect(`/coworking-dashboard/${spaceSlug}/orders`);
}
