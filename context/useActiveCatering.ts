"use client";

import { useCateringOptional } from "@/context/CateringContext";
import { useCoworkingAddCateringOptional } from "@/context/CoworkingAddCateringContext";

export function useActiveCatering() {
  const coworkingAddCatering = useCoworkingAddCateringOptional();
  const catering = useCateringOptional();

  if (coworkingAddCatering) return coworkingAddCatering;
  if (catering) return catering;

  throw new Error(
    "useActiveCatering must be used within CateringProvider or CoworkingAddCateringProvider"
  );
}
