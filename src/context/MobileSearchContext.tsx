"use client";
import React, { createContext, useContext, useState } from "react";

interface MobileSearchContextType {
  mobileSearchOpen: boolean;
  openMobileSearch: () => void;
  closeMobileSearch: () => void;
  toggleMobileSearch: () => void;
}

const MobileSearchContext = createContext<MobileSearchContextType>({
  mobileSearchOpen: false,
  openMobileSearch: () => {},
  closeMobileSearch: () => {},
  toggleMobileSearch: () => {},
});

export function MobileSearchProvider({ children }: { children: React.ReactNode }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <MobileSearchContext.Provider
      value={{
        mobileSearchOpen,
        openMobileSearch:  () => setMobileSearchOpen(true),
        closeMobileSearch: () => setMobileSearchOpen(false),
        toggleMobileSearch: () => setMobileSearchOpen(v => !v),
      }}
    >
      {children}
    </MobileSearchContext.Provider>
  );
}

export const useMobileSearch = () => useContext(MobileSearchContext);
