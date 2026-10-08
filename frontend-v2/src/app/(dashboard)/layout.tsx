import CleanAppShell from "@/components/layout/CleanAppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CleanAppShell>{children}</CleanAppShell>;
}
