"use client";

import React, { useEffect } from "react";

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleUncaughtError = (event: ErrorEvent) => {
      console.error("Global uncaught error:", event.error);
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Global unhandled promise rejection:", event.reason);
      event.preventDefault();
    };

    window.addEventListener("error", handleUncaughtError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleUncaughtError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
