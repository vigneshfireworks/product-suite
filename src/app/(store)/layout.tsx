import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { SubHeader } from "@/components/layout/SubHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ActiveBusinessProvider } from "@/context/ActiveBusinessContext";
import { MobileSearchProvider } from "@/context/MobileSearchContext";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSearchProvider>
      <ActiveBusinessProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          {/* SubHeader hides itself on mobile via hidden md:block on its root */}
          <Suspense fallback={<div className="h-[46px] hidden md:block bg-white border-b border-gray-100" />}>
            <SubHeader />
          </Suspense>
          {/* bottom-nav offset on mobile */}
          <main className="flex-1 pb-[60px] md:pb-0">
            <Suspense>
              {children}
            </Suspense>
          </main>
          <Footer />
          {/* MobileBottomNav hides itself on desktop via md:hidden on its root */}
          <MobileBottomNav />
        </div>
      </ActiveBusinessProvider>
    </MobileSearchProvider>
  );
}
