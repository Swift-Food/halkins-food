"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-gray-900"
          aria-label="Halkin x Swift"
        >
          <Image
            src="/halkinLogo.svg"
            alt="Halkin"
            width={190}
            height={44}
            className="block h-8 w-auto self-center sm:h-9"
            priority
          />
          <span className="flex items-center self-center text-sm font-semibold leading-none tracking-[0.2em] text-gray-500">
            X
          </span>
          <Image
            src="/SwiftFullLogoPink.png"
            alt="Swift"
            width={100}
            height={44}
            className="block h-8 w-auto self-center sm:h-9"
            priority
          />
        </Link>
        <div className="flex items-center gap-6"></div>
      </div>
    </nav>
  );
}
