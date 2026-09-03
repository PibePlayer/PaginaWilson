import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { STORE_NAME, STORE_DESCRIPTION } from "@/lib/store-config";
import WhatsAppButton from "@/components/WhatsAppButton";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: STORE_NAME,
  description: STORE_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <WhatsAppButton />
        <Footer />
      </body>
    </html>
  );
}