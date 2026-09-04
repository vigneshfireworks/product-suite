"use client";
import React, { useState } from "react";
import Link from "next/link";
import { X, ShoppingCart } from "lucide-react";
import { useActiveBusiness } from "@/context/ActiveBusinessContext";

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
          >
            <ShoppingCart size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-xl text-brand-dark">Product Suite</span>
        </div>

        <h2 className="font-heading font-bold text-lg text-brand-dark mb-2">About Us</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-4">
          Product Suite is a multi-business platform bringing together Sri Ganesh Crackers, Royal
          Invitations, Gift Bliss Return Gifts, Market Vision Analytics and Viki Finance — all
          under one roof.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed mb-5">
          Our mission is to make shopping, finance, and market insights simple and accessible for
          everyone. From festive crackers to wedding invitations, curated gifts to expert financial
          tools — we've got it all in one place.
        </p>

        <div className="border-t pt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Contact</span>
          <a href="mailto:productsuite@gmail.com" className="text-accent hover:underline">
            productsuite@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const [showAbout, setShowAbout] = useState(false);
  const { activeBusiness } = useActiveBusiness();

  return (
    <>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

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
                { href: "/", label: "Home" },
                { href: "/login", label: "Login" },
                { href: "/signup", label: "Sign Up" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-gray-400 text-sm hover:text-accent transition-colors">
                  {label}
                </Link>
              ))}
              <button
                onClick={() => setShowAbout(true)}
                className="text-gray-400 text-sm hover:text-accent transition-colors"
              >
                About Us
              </button>
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
    </>
  );
}
