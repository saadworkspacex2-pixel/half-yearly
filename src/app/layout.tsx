import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Class 8 Result",
  description: "View exam results, rankings, and performance analytics for Class 8 — Dahlia (B)",
  icons: {
    icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTZ8N1jkOgd4MHMNEN2wN70OWVAAkZt3ZlU6zqVnGadw&s=10",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Anek+Bangla:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#090D16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">{children}</body>
    </html>
  );
}
