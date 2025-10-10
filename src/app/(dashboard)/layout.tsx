import "@/app/globals.css";
import DashboardLayout from "@/components/layout/DashboardLayout";


export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}