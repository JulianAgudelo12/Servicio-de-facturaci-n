import "../globals.css";
import AdminLayout from "../../components/admin/AdminLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
