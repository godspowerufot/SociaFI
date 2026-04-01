import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import Header from "../components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Social DApp | Gaming Edition",
  description: "Minimalist Social Experience on Starknet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-slate-950 text-slate-200`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            {/* Main Layout Container */}
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 py-6">
              {children}
            </main>
            
            <footer className="py-6 border-t border-slate-900 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest italic">Phase 1 // Starknet Sepolia</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
