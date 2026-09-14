"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface TruckFillAddToCartButtonProps {
  onClick: () => void;
  added?: boolean;
  disabled?: boolean;
  price: string;
  /** the flood/fill colour — defaults to the reference demo's red */
  color?: string;
  className?: string;
}

// keep in sync with the .tcart-btn__track--run animation duration in globals.css
const TRACK_ANIM_MS = 1500;

/**
 * Matches the AXIS reference demo's popup button exactly: a white pill
 * with the price + a coloured "Add to cart" label at rest. On click, a
 * solid colour fill sweeps left → right with a little truck riding the
 * leading edge, then it settles into a white "✓ Added" checkmark before
 * resetting back to idle.
 */
export function TruckFillAddToCartButton({
  onClick,
  added = false,
  disabled = false,
  price,
  color = "#cc274a",
  className,
}: TruckFillAddToCartButtonProps) {
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleClick = () => {
    if (disabled) return;
    setRunId(id => id + 1);
    setIsRunning(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsRunning(false), TRACK_ANIM_MS);
    onClick();
  };

  const hideIdleContent = isRunning || added;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{ "--tcart-color": color } as React.CSSProperties}
      className={cn("tcart-btn flex-1 py-2.5 px-4", className)}
    >
      {!disabled && (
        <span key={runId} className={cn("tcart-btn__track", runId > 0 && "tcart-btn__track--run")}>
          <span className="tcart-btn__fill" />
          <svg
            className="tcart-btn__truck"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="7" width="13" height="9" rx="1" />
            <path d="M14 10h4l3 3v3h-7z" />
            <circle cx="6" cy="18" r="1.5" />
            <circle cx="17.5" cy="18" r="1.5" />
          </svg>
        </span>
      )}

      <span className={cn("tcart-btn__content", hideIdleContent && "tcart-btn__content--hidden")}>
        <span>{disabled ? "Out of Stock" : "Add to cart"}</span>
        {!disabled && <span>{price}</span>}
      </span>

      <span className={cn("tcart-btn__added", added && "tcart-btn__added--show")}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Added
      </span>
    </button>
  );
}
