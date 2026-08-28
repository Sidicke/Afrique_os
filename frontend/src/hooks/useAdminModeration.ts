"use client";

import { useCallback } from "react";
import { useAsyncResource } from "./useAsyncResource";
import { adminService } from "@/services/adminService";

/** Hook client de la vue générale de la modération (doc 10) */
export function useAdminModeration() {
  const fetcher = useCallback(() => adminService.getModeration(), []);
  return useAsyncResource(fetcher, "Impossible de charger la modération de la plateforme.");
}
