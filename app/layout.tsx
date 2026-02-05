import "./globals.css";
import Navbar from "@/lib/components/navbar";
import Footer from "@/lib/components/footer";
import { IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Halkins - Catering Made Easy",
  description: "Order catering for your events with Halkins",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="Swift">
      <body className={`${ibmPlexMono.className} ${ibmPlexMono.variable}`}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
