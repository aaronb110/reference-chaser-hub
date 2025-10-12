import "./globals.css";
import type { Metadata } from "next";
import ClientRoot from "./ClientRoot"; // 👈 new file we’ll add next

export const metadata: Metadata = {
  title: "Refevo – Reference Hub",
  description: "Making reference checks effortless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
