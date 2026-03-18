import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cougars Hockey — Team Manager",
  description: "Manage attendance and generate balanced teams",
  icons: { icon: '/cougars.avif' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-base">
      <body className={`${geistSans.variable} antialiased h-full bg-base text-hi`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
