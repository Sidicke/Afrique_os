"use client";

import { useEffect, useState } from "react";
import { getSessionUser } from "@/lib/api/session";

export function PublicVisibilityGuard({ children, hideForRole }: { children: React.ReactNode, hideForRole: "CLIENT" | "VENDEUR" | "ADMIN" }) {
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    const user = getSessionUser();
    if (user?.role === hideForRole) {
      setShouldHide(true);
    }
  }, [hideForRole]);

  if (shouldHide) return null;
  return <>{children}</>;
}
