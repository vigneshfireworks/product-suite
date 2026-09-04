"use client";
import React, { createContext, useContext, useState } from "react";

export interface ActiveBusiness {
  name: string;
  emoji: string;
  bg: string;   // pastel background for the icon chip
  dot: string;  // accent colour
}

interface ActiveBusinessCtx {
  activeBusiness: ActiveBusiness | null;
  setActiveBusiness: (b: ActiveBusiness | null) => void;
}

const Ctx = createContext<ActiveBusinessCtx>({
  activeBusiness: null,
  setActiveBusiness: () => {},
});

export function ActiveBusinessProvider({ children }: { children: React.ReactNode }) {
  const [activeBusiness, setActiveBusiness] = useState<ActiveBusiness | null>(null);
  return (
    <Ctx.Provider value={{ activeBusiness, setActiveBusiness }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveBusiness() {
  return useContext(Ctx);
}
