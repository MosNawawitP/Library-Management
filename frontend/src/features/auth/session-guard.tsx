"use client";

import { type ReactNode, useEffect } from "react";
import {
  SessionExpiredError,
  authenticatedFetch,
} from "@/lib/api-client";

interface SessionGuardProps {
  accessToken: string;
  children: ReactNode;
}

export function SessionGuard({ accessToken, children }: SessionGuardProps) {
  useEffect(() => {
    const controller = new AbortController();

    void authenticatedFetch("/api/auth/validate-token", {
      accessToken,
      signal: controller.signal,
    }).catch((error: unknown) => {
      if (controller.signal.aborted || error instanceof SessionExpiredError) {
        return;
      }

      // A transient validation failure must not sign out an otherwise valid session.
    });

    return () => controller.abort();
  }, [accessToken]);

  return children;
}
