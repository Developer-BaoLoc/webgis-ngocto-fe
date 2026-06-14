"use client";

import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { siteConfig } from "@/config/site.config";
import { wardConfig } from "@/config/ward.config";
import { PageHeader } from "@/components/layout/page-header";
import { DynamicDashboardPage } from "@/components/dashboard/dynamic-dashboard-page";

export default function DashboardPage() {
  const { catalog } = useLayerCatalog();
  const project = catalog?.project;

  const description = project
    ? `${project.description} — ${project.district}, ${project.province}`
    : `${siteConfig.description} — ${wardConfig.district}, ${wardConfig.city}`;

  return (
    <div className="space-y-8">
      <PageHeader title="Tổng quan" description={description} />
      <DynamicDashboardPage />
    </div>
  );
}
