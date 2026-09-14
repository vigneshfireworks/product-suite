"use client";

import React from "react";

interface OrderPackingAnimationProps {
  /** Small heading shown under the scene, e.g. "Packing your order…" */
  message?: string;
}

/**
 * Full-screen overlay played while an order is being submitted:
 * items drop into a box → box seals → a delivery truck pulls in,
 * opens its cargo door → the box flies in → door closes → truck drives off.
 *
 * Everything runs on ONE shared CSS clock (see .pack-scene / --pack-dur in
 * globals.css) so every part's timing stays in sync — same idea as the
 * reference "add to cart" demo's single 2.4s @keyframes clock.
 */
export function OrderPackingAnimation({ message = "Packing your order…" }: OrderPackingAnimationProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div
        className="rounded-2xl shadow-2xl w-full max-w-sm px-6 py-8 flex flex-col items-center"
        style={{ background: "linear-gradient(180deg, #fbe9dc 0%, #f3e3ee 60%, #e7ddf0 100%)" }}
      >
        <svg className="pack-scene" viewBox="0 0 400 200" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="headlightBeam" cx="0%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* road */}
          <rect x="0" y="160" width="400" height="16" fill="#264a4f" />
          <line x1="0" y1="168" x2="400" y2="168" stroke="#e8e2d8" strokeWidth="2" strokeDasharray="10 8" />

          {/* items that drop into the box */}
          <g className="pack-item pack-item--1">
            <rect x="120" y="40" width="16" height="16" rx="3" fill="#7c5cbf" />
          </g>
          <g className="pack-item pack-item--2">
            <rect x="150" y="34" width="14" height="14" rx="3" fill="#9b7bd6" />
          </g>
          <g className="pack-item pack-item--3">
            <rect x="176" y="42" width="15" height="15" rx="3" fill="#7c5cbf" />
          </g>

          {/* the box: body stays put, flaps rotate shut */}
          <g className="pack-box">
            <rect x="118" y="118" width="80" height="46" rx="4" fill="#c98a45" />
            <rect x="118" y="118" width="80" height="46" rx="4" fill="#00000012" />
            <rect x="118" y="140" width="80" height="6" fill="#7c5cbf" />
            <g className="pack-box__flap pack-box__flap--left">
              <rect x="118" y="98" width="40" height="22" rx="2" fill="#dba15e" />
            </g>
            <g className="pack-box__flap pack-box__flap--right">
              <rect x="158" y="98" width="40" height="22" rx="2" fill="#dba15e" />
            </g>
          </g>

          {/* the sealed box that later flies into the truck */}
          <g className="pack-box-fly">
            <rect x="-20" y="-11" width="40" height="24" rx="4" fill="#c98a45" />
            <rect x="-20" y="1" width="40" height="4" fill="#7c5cbf" />
          </g>

          {/* truck: drives in from the right, pauses, drives out to the left.
              Cab/front faces left (the direction it exits), so the headlight
              beam and taillight sit at opposite ends of the body. */}
          <g className="pack-truck">
            {/* headlight beam — fanning out ahead of the cab */}
            <polygon points="230,128 165,110 165,150" fill="url(#headlightBeam)" className="pack-truck__beam" />

            {/* cargo box */}
            <rect x="266" y="112" width="94" height="52" rx="6" fill="#1d4b52" />
            <rect x="274" y="120" width="40" height="36" rx="4" fill="#0a1f22" className="pack-truck__door" />
            {/* cab */}
            <rect x="230" y="126" width="46" height="38" rx="6" fill="#1d4b52" />
            <rect x="238" y="132" width="26" height="20" rx="3" fill="#a9d8dc" opacity="0.85" />
            {/* purple side stripe */}
            <rect x="230" y="146" width="130" height="6" fill="#7c5cbf" />
            {/* branding, painted directly on the cargo body like the reference */}
            <text x="337" y="141" fontSize="10" fontWeight="700" fill="#fff" textAnchor="middle" letterSpacing="1">ORDER</text>
            {/* taillight (rear, right end) */}
            <rect x="357" y="118" width="4" height="10" rx="1.5" fill="#e6483f" />
            {/* headlight housing (front, left end) */}
            <rect x="229" y="140" width="4" height="7" rx="1.5" fill="#ffe9a8" />

            {/* wheels — sunburst hubcap */}
            {[256, 340].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="168" r="10" fill="#111" />
                <circle cx={cx} cy="168" r="5.5" fill="#d8dde0" />
                {[0, 45, 90, 135].map((deg) => (
                  <line
                    key={deg}
                    x1={cx} y1="168" x2={cx} y2="163.5"
                    stroke="#111" strokeWidth="1"
                    transform={`rotate(${deg} ${cx} 168)`}
                  />
                ))}
              </g>
            ))}
          </g>
        </svg>
        <p className="text-sm font-semibold text-brand-dark mt-2 text-center">{message}</p>
      </div>
    </div>
  );
}
