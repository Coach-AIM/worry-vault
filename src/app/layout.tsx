import type { Metadata } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/context/AuthContext";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Momentum",
  description: "A minimalist mental wellness application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${lora.variable}`}>
      <body className="app-body bg-[#f8faf9] text-stone-900 min-h-screen">
        <AuthProvider>
          <Navigation />
          <main className="app-main w-full">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
