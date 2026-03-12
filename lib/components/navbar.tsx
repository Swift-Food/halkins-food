"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-end gap-4 text-gray-900 sm:gap-5"
          aria-label="Halkin and Swift"
        >
          <span className="flex h-8 items-end sm:h-10">
            <Image
              src="/halkinLogo.svg"
              alt="Halkin"
              width={190}
              height={44}
              className="block h-7 w-auto sm:h-8"
              priority
            />
          </span>
          <span
            aria-hidden="true"
            className="mb-0.5 h-8 w-px bg-black/70 sm:h-10"
          />
          <span className="flex h-8 items-end sm:h-10">
            <Image
              src="/SwiftFullLogoPink.png"
              alt="Swift"
              width={100}
              height={44}
              className="block h-7 w-auto sm:h-8"
              priority
            />
          </span>
        </Link>
        <div className="flex items-center gap-6"></div>
      </div>
    </nav>
  );
}
