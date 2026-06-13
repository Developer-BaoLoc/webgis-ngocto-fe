"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  className?: string;
}

export function MapView({ center, zoom, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [center.lng, center.lat],
      zoom,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng, zoom]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[calc(100vh-12rem)] min-h-[400px] w-full rounded-xl"}
    />
  );
}
