import { DynamicDashboardPage } from "@/components/dashboard/dynamic-dashboard-page";

interface PublishedDashboardRouteProps {
  params: Promise<{ id: string }>;
}

export default async function PublishedDashboardRoute({
  params,
}: PublishedDashboardRouteProps) {
  const { id } = await params;
  return <DynamicDashboardPage dashboardId={id} />;
}
