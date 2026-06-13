"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecordsTable } from "@/components/records/records-table";
import { LayerBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getLayerDetailByCode,
  getLayerSchema,
} from "@/lib/api/layers";
import { getLayerRecords } from "@/lib/api/records";
import { toLayer } from "@/lib/layers/adapter";
import type { LayerSchema } from "@/types/api/schema";
import type { RecordItem } from "@/types/api/records";
import { geometryKindLabels } from "@/types/layer.types";

interface LayerDetailViewProps {
  code: string;
}

export function LayerDetailView({ code }: LayerDetailViewProps) {
  const [layerName, setLayerName] = useState("");
  const [layerId, setLayerId] = useState("");
  const [geometryKind, setGeometryKind] = useState("");
  const [color, setColor] = useState("#64748b");
  const [hasGeometry, setHasGeometry] = useState(true);
  const [schema, setSchema] = useState<LayerSchema | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 20;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const detail = await getLayerDetailByCode(code);
      const layer = toLayer(detail);
      setLayerId(layer.id);
      setLayerName(layer.name);
      setGeometryKind(layer.geometryKind);
      setColor(layer.color);
      setHasGeometry(layer.hasGeometry);

      const [schemaData, recordsData] = await Promise.all([
        getLayerSchema(layer.id),
        getLayerRecords(layer.id, { page, pageSize }),
      ]);

      setSchema(schemaData);
      setRecords(recordsData.records);
      setTotal(recordsData.meta.total ?? recordsData.records.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu lớp");
    } finally {
      setIsLoading(false);
    }
  }, [code, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={layerName || code}
        description={
          schema
            ? `Schema v${schema.version} · ${schema.fields.length} trường`
            : `Lớp dữ liệu · code: ${code}`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <LayerBadge
              label={geometryKindLabels[geometryKind] ?? geometryKind}
              color={color}
            />
            <LayerBadge label={`code: ${code}`} />
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">
            Bảng dữ liệu
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cột render từ published schema — Phase 1
          </p>
        </CardHeader>
        <CardContent>
          {schema ? (
            <RecordsTable
              fields={schema.fields}
              records={records}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted">
              {isLoading ? "Đang tải schema..." : "Không có schema"}
            </div>
          )}
        </CardContent>
      </Card>

      {hasGeometry && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground">Bản đồ</h2>
            <p className="mt-1 text-sm text-muted">
              GeoJSON: GET /api/layers/{layerId || "…"}/geojson — Phase 2 map
              editor
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">
              Sẽ tích hợp hiển thị lớp trên MapLibre và ghim/vẽ geometry.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
