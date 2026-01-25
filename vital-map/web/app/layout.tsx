import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter font - similar to Instagram Sans, clean and modern
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Holistic Interoperability Engine | Cultivating Self",
  description:
    "High-performance GIS interface connecting clinical and community wellness resources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
