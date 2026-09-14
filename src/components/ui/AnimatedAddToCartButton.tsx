"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface AnimatedAddToCartButtonProps {
  onClick: () => void;
  added?: boolean;
  disabled?: boolean;
  /** "lg" matches the main product-page button, "sm" matches the product-card button */
  size?: "lg" | "sm";
  /** escape hatch: overrides the padding/text-size classes from `size` exactly, for a one-off spot */
  sizeClassName?: string;
  idleLabel?: string;
  addedLabel?: string;
  disabledLabel?: string;
  className?: string;
}

// keep these in sync with the .cart-btn__run animation duration in globals.css
const FLIGHT_MS  = 1500; // idle → "In Flight" → lands
const SETTLE_MS  = 700;  // "✓ In Cart" hold before resetting to idle
const TOTAL_MS   = FLIGHT_MS + SETTLE_MS; // 2200ms, matches the 2.2s CSS animations

/**
 * Matches the "Rocket Launch Button" reference video: dark navy pill.
 * On click, a rocket launches out of a little sky window above the
 * button, then returns on a parachute and descends back into the
 * button — landing as a "+1" badge and a "✓ In Cart" checkmark.
 */
export function AnimatedAddToCartButton({
  onClick,
  added, // kept for API compatibility; the rocket sequence drives its own phases
  disabled = false,
  size = "lg",
  sizeClassName,
  idleLabel = "Add to Cart",
  addedLabel = "In Cart",
  disabledLabel = "Out of Stock",
  className,
}: AnimatedAddToCartButtonProps) {
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<"idle" | "flying" | "landed">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const handleClick = () => {
    if (disabled) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunId(id => id + 1);
    setPhase("flying");
    timers.current.push(setTimeout(() => setPhase("landed"), FLIGHT_MS));
    timers.current.push(setTimeout(() => setPhase("idle"), TOTAL_MS));
    onClick();
  };

  const sizeClasses =
    sizeClassName ??
    (size === "lg" ? "py-2.5 text-sm" : "py-1.5 text-xs");

  const isRunning = phase !== "idle";

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn("cart-btn relative overflow-visible font-bold", sizeClasses, className)}
    >
      {/* sky window + rocket + parachute, restarted every click via key */}
      {!disabled && (
        <div key={runId} className={cn("cart-btn__sky", isRunning && "cart-btn__run")}>
          <span className="cart-btn__rocket">🚀</span>
          <span className="cart-btn__parachute">🪂</span>
        </div>
      )}

      <span className="cart-btn__bump">
        <span className={cn("cart-btn__content", isRunning && "cart-btn__content--hidden")}>
          {!disabled && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          )}
          <span>{disabled ? disabledLabel : idleLabel}</span>
        </span>

        <span className={cn("cart-btn__flying-label", phase === "flying" && "cart-btn__flying-label--show")}>
          In Flight
        </span>

        <span className={cn("cart-btn__landed-label", phase === "landed" && "cart-btn__landed-label--show")}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {addedLabel}
        </span>
      </span>

      {!disabled && (
        <span className={cn("cart-btn__badge", phase === "landed" && "cart-btn__badge--show")}>+1</span>
      )}
    </button>
  );
}
