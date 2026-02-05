"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Halkins
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/event-order"
            className="text-sm font-medium text-gray-700 hover:text-pink-500 transition-colors"
          >
            Order Catering
          </Link>
        </div>
      </div>
    </nav>
  );
}
