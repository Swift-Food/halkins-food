"use client";

import CoworkingDashboard from "@/lib/components/coworking-dashboard/CoworkingDashboard";
import { use } from "react";

export default function CoworkingDashboardPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = use(params);

  return <CoworkingDashboard spaceSlug={spaceSlug} />;
}
