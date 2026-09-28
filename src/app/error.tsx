"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="text-red-500 mb-4">
          <AlertCircle size={64} className="mx-auto" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-brand-dark mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-8">
          An unexpected error occurred. Please try refreshing the page.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: "#FFC43F" }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
