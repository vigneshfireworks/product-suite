"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md">
          <h1 className="font-heading text-3xl font-bold text-brand-dark mb-2">Critical Error</h1>
          <p className="text-gray-500 mb-8">
            A critical error occurred in the application.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#FFC43F" }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
