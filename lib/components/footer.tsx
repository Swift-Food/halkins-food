"use client";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Halkins.
        </p>
      </div>
    </footer>
  );
}
