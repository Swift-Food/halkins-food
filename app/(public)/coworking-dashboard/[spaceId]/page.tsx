"use client";

import CoworkingDashboard from "@/lib/components/coworking-dashboard/CoworkingDashboard";
import { use } from "react";

export default function CoworkingDashboardPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = use(params);

  return <CoworkingDashboard spaceId={spaceId} />;
}
