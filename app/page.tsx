import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Halkins</h1>
      <p className="text-lg text-gray-600 mb-8">Catering made easy.</p>
      <Link
        href="/event-order"
        className="btn btn-primary text-white px-8 py-3 rounded-lg text-lg"
      >
        Start Your Order
      </Link>
    </div>
  );
}
