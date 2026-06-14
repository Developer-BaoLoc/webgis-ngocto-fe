import { DashboardBuilderPage } from "@/components/admin/dashboard-builder-page";

interface DashboardBuilderRouteProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardBuilderRoute({
  params,
}: DashboardBuilderRouteProps) {
  const { id } = await params;
  return <DashboardBuilderPage dashboardId={id} />;
}
