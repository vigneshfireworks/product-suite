"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="font-heading text-3xl font-bold text-brand-dark mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: "#FFC43F" }}
        >
          <ShoppingCart size={20} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
