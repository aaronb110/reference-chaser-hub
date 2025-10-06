import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import "./styles/theme.css";
import "./styles/components.css";


export const metadata: Metadata = {
  title: "Reference Chaser Hub",
  description: "Automated reference request system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
