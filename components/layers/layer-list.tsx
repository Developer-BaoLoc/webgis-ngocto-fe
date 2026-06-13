"use client";

import Link from "next/link";
import { LayerBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GeometryTypeIcon } from "@/components/layers/layer-utils";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import { layerStatusLabels } from "@/types/layer.types";

export function LayerList() {
  const { layers, error } = useLayerCatalog();

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Không tải được danh sách lớp. Kiểm tra backend tại port 4000.
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <p className="text-sm text-muted">
        Chưa có lớp dữ liệu. Khởi động backend và thử lại.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {layers.map((layer) => (
        <Link key={layer.id} href={`/lop-du-lieu/${layer.code}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: layer.color }}
                />
                <LayerBadge
                  label={layerStatusLabels[layer.status]}
                  status={layer.status}
                />
              </div>
              <h3 className="font-semibold text-foreground">{layer.name}</h3>
              <p className="mt-1 text-sm text-muted">{layer.description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                <GeometryTypeIcon type={layer.geometryType} />
                <span>{layer.geometryType}</span>
                {layer.code !== layer.id && (
                  <>
                    <span>·</span>
                    <span>code: {layer.code}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
