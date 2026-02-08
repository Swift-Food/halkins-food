"use client";

import { CoworkingProvider } from "@/context/CoworkingContext";
import { CateringFilterProvider } from "@/context/CateringFilterContext";
import CoworkingOrderFlow from "@/lib/components/coworking/CoworkingOrderFlow";
import { CateringProvider } from "@/context/CateringContext";

export default function CoworkingPage() {
  return (
    <CoworkingProvider>
      <CateringProvider>
      <CateringFilterProvider>
        <CoworkingOrderFlow />
      </CateringFilterProvider>
      </CateringProvider>
    </CoworkingProvider>
  );
}
