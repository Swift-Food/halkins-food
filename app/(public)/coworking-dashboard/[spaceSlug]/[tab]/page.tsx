import CoworkingDashboard from "@/lib/components/coworking-dashboard/CoworkingDashboard";
import { notFound } from "next/navigation";

const DASHBOARD_TABS = ["orders", "calendar", "payment"] as const;

type DashboardTab = (typeof DASHBOARD_TABS)[number];

function isDashboardTab(tab: string): tab is DashboardTab {
  return DASHBOARD_TABS.includes(tab as DashboardTab);
}

export default async function CoworkingDashboardTabPage({
  params,
}: {
  params: Promise<{ spaceSlug: string; tab: string }>;
}) {
  const { spaceSlug, tab } = await params;

  if (!isDashboardTab(tab)) {
    notFound();
  }

  return <CoworkingDashboard spaceSlug={spaceSlug} activeTab={tab} />;
}
