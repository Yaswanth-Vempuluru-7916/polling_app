// app/layout.tsx
import type { Metadata } from "next";
import { Rajdhani, Montserrat } from "next/font/google";
import "@/styles/globals.css"
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Solo Polling System",
  description: "A polling application with Solo Leveling theme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rajdhani.variable} ${montserrat.variable} antialiased bg-black text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}