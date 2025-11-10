import "./globals.css";
import type { Metadata } from "next";
import ClientRoot from "./ClientRoot";
import { Toaster } from "react-hot-toast";
import { RoleProvider } from "@/context/RoleContext"; // ✅ import here

export const metadata: Metadata = {
  title: "Refevo – Reference Hub",
  description: "Making reference checks effortless.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
      
        

        {/* ✅ Provide global role context to all routes */}
        <RoleProvider>
          <ClientRoot>{children}</ClientRoot>
        </RoleProvider>

        <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
