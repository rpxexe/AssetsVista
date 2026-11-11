"use client";

import React from "react";
import { SkulletProvider } from "skullet/react";

/**
 * Configures global Skullet skeleton behavior across AssetsVista.
 * Light/dark surface colors are driven by CSS variables in app/globals.css
 * so next-themes class toggling updates skeleton colors synchronously.
 */
export function AppSkulletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SkulletProvider
      reveal="smart"
      theme={{
        animation: "shimmer",
        speed: "slow",
        radius: "6px",
      }}
      text={{
        top: "ascender",
        bottom: "descender",
      }}
    >
      {children}
    </SkulletProvider>
  );
}

