"use client";

import { useCallback } from "react";
import { Customer } from "@/types/dashboard";
import { dashboardService } from "@/services/dashboardService";
import { useAsyncResource } from "@/hooks/useAsyncResource";

/** Liste clients — prête à être branchée sur l'API réelle sans toucher aux composants */
export function useCustomers() {
  return useAsyncResource<Customer[]>(
    useCallback(() => dashboardService.getCustomers(), []),
    "Impossible de charger les clients."
  );
}
