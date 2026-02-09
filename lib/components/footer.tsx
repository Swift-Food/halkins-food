"use client";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Halkins.
        </p>
        <a
          href="/coworking-dashboard/halkins"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Admin Dashboard
        </a>
      </div>
    </footer>
  );
}
