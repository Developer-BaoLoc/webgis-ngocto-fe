"use client";

import Link from "next/link";
import { LayerBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GeometryTypeIcon, LayerRow } from "@/components/layers/layer-utils";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { wardConfig } from "@/config/ward.config";
import { layerStatusLabels } from "@/types/layer.types";
import { StatCard } from "./stat-card";

export function DashboardOverview() {
  const { catalog, layers, error } = useLayerCatalog();
  const project = catalog?.project;

  const readyCount = layers.filter((l) => l.status === "ready").length;
  const inProgressCount = layers.filter((l) => l.status === "in_progress").length;

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Không tải được dữ liệu từ API ({error}). Đang dùng thông tin mặc định.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng lớp dữ liệu"
          value={layers.length || "—"}
          hint={
            catalog?.plannedLayers.length
              ? `+${catalog.plannedLayers.length} lớp dự kiến`
              : "Từ GET /api/layers"
          }
          accent="blue"
        />
        <StatCard
          label="Sẵn sàng"
          value={readyCount}
          hint="Có dữ liệu GeoJSON"
          accent="green"
        />
        <StatCard
          label="Đang triển khai"
          value={inProgressCount}
          hint="Đang populate dữ liệu"
          accent="amber"
        />
        <StatCard
          label="Khu vực"
          value={project?.ward ?? "Long Bình"}
          hint={project?.district ?? wardConfig.district}
          accent="slate"
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">
              Danh sách lớp dữ liệu
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nguồn: API catalog — metadata-driven Phase 1
            </p>
          </CardHeader>
          <CardContent>
            {layers.length === 0 ? (
              <p className="text-sm text-muted">
                Chưa có lớp nào. Khởi động backend tại port 4000.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {layers.map((layer) => (
                  <Link
                    key={layer.id}
                    href={`/lop-du-lieu/${layer.code}`}
                    className="flex items-center justify-between gap-4 py-4 transition-colors first:pt-0 last:pb-0 hover:text-primary"
                  >
                    <LayerRow layer={layer} />
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <LayerBadge
                        label={layerStatusLabels[layer.status]}
                        status={layer.status}
                      />
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <GeometryTypeIcon type={layer.geometryType} />
                        {layer.geometryType}
                        {!layer.hasGeometry && " · không có bản đồ"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {catalog?.plannedLayers && catalog.plannedLayers.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">
                Lớp dự kiến (roadmap)
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {catalog.plannedLayers.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-muted"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    {item.name}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
