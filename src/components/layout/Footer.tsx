"use client";
import React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useActiveBusiness } from "@/context/ActiveBusinessContext";

export function Footer() {
  const { activeBusiness } = useActiveBusiness();

  return (
    <footer className="block bg-brand-dark text-white mt-8 md:mt-12">
      <div className="max-w-7xl mx-auto px-6 py-5">
        {/* Single compact row */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Left: brand — swaps between Product Suite and the active business */}
          <div
            className="flex items-center gap-2 transition-all duration-300"
            key={activeBusiness?.name ?? "product-suite"}
            style={{ animation: "footer-brand-in 0.3s ease" }}
          >
            {activeBusiness ? (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-base"
                  style={{ background: activeBusiness.bg }}
                >
                  {activeBusiness.emoji}
                </div>
                <span className="font-heading font-bold text-base text-white truncate max-w-[160px]">
                  {activeBusiness.name}
                </span>
              </>
            ) : (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
                >
                  <ShoppingCart size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-heading font-bold text-base text-white">Product Suite</span>
              </>
            )}
          </div>

          {/* Centre: nav links */}
          <div className="flex flex-wrap items-center gap-5">
            {[
              { href: "/",       label: "Home",     newTab: false },
              { href: "/login",  label: "Login",    newTab: false },
              { href: "/signup", label: "Sign Up",  newTab: false },
              { href: "/about",  label: "About Us", newTab: true  },
            ].map(({ href, label, newTab }) => (
              <Link
                key={href}
                href={href}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noopener noreferrer" : undefined}
                className="text-gray-400 text-sm hover:text-accent transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right: contact */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Support:</span>
            <a href="mailto:productsuite@gmail.com" className="text-accent hover:underline">
              productsuite@gmail.com
            </a>
          </div>
        </div>

        {/* Bottom line */}
        <div className="border-t border-gray-800 mt-4 pt-3 text-center">
          <p className="text-gray-600 text-xs">© 2024 Product Suite. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
