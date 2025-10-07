import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refevo – Reference Hub",
  description: "Making reference checks effortless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
