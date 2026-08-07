import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/ui/PageTransition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white rounded-tl-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.03)] border-l border-t border-gray-200 mt-2">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
