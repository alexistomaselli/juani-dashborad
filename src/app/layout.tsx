import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Juani Cocina",
  description: "Dashboard de pedidos de Juani Cocina",
  icons: {
    icon: "/favicon.png",
  },
};

import { AuthProvider } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { DashboardProvider } from "@/context/DashboardContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <AuthProvider>
          <AuthGuard>
            <DashboardProvider>
              {children}
            </DashboardProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
