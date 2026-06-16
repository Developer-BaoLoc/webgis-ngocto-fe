"use client";

import Link from "next/link";
import { MapPageContent } from "@/components/map/map-page-content";
import { useLayerCatalog } from "@/providers/layer-catalog-provider";
import type { MapViewConfig } from "@/types/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

interface IocMapPanelProps {
  mapView?: MapViewConfig | null;
  boundary?: GeoJsonFeatureCollection | null;
  boundaryError?: string | null;
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 17 10 5 10-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m2 12 10 5 10-5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H3v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3l-7 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l7-7" />
    </svg>
  );
}

export function IocMapPanel({
  mapView = null,
  boundary = null,
  boundaryError = null,
}: IocMapPanelProps) {
  const { layers } = useLayerCatalog();
  const mapLayers = layers.filter((layer) => layer.geometryKind !== "none");
  const visibleLayers = mapLayers.slice(0, 6);
  const overflow = mapLayers.length - visibleLayers.length;

  return (
    <section className="ioc-map-panel ioc-map-panel--hero">
      <span className="ioc-map-frame-corner ioc-map-frame-corner--tl" aria-hidden />
      <span className="ioc-map-frame-corner ioc-map-frame-corner--tr" aria-hidden />
      <span className="ioc-map-frame-corner ioc-map-frame-corner--bl" aria-hidden />
      <span className="ioc-map-frame-corner ioc-map-frame-corner--br" aria-hidden />

      <div className="ioc-map-panel-body">
        <MapPageContent
          mapView={mapView}
          boundary={boundary}
          boundaryError={boundaryError}
          embedded
          showAllLayers
        />

        <div className="ioc-map-float-bar" role="toolbar" aria-label="Điều khiển bản đồ">
          <div
            className="ioc-map-float-group"
            title={`${mapLayers.length} lớp dữ liệu`}
            aria-label={`${mapLayers.length} lớp dữ liệu`}
          >
            <span className="ioc-map-icon-btn ioc-map-icon-btn--static" aria-hidden>
              <LayersIcon />
            </span>
            <span className="ioc-map-layer-count">{mapLayers.length}</span>
            <span className="ioc-map-layer-dots" aria-hidden>
              {visibleLayers.map((layer) => (
                <span
                  key={layer.id}
                  className="ioc-map-layer-dot"
                  style={{ background: layer.color }}
                  title={layer.name}
                />
              ))}
              {overflow > 0 && (
                <span className="ioc-map-layer-dot ioc-map-layer-dot--more" title={`+${overflow} lớp`}>
                  +{overflow}
                </span>
              )}
            </span>
          </div>

          <Link
            href="/ban-do"
            className="ioc-map-icon-btn"
            title="Toàn màn hình"
            aria-label="Mở bản đồ toàn màn hình"
          >
            <ExpandIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
