"use client";

import { useEffect, useState } from "react";
import { getAdministrativeBoundary } from "@/lib/api/map-view";
import type { GeoJsonFeatureCollection } from "@/types/gis.types";

interface UseWardBoundaryOptions {
  initialBoundary?: GeoJsonFeatureCollection | null;
  initialError?: string | null;
}

export function useWardBoundary({
  initialBoundary = null,
  initialError = null,
}: UseWardBoundaryOptions) {
  const [boundary, setBoundary] = useState(initialBoundary);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (initialBoundary?.features.length) {
      setBoundary(initialBoundary);
      setError(null);
      return;
    }

    if (!initialError) return;

    let cancelled = false;

    getAdministrativeBoundary()
      .then((data) => {
        if (cancelled) return;
        setBoundary(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được ranh giới phường",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [initialBoundary, initialError]);

  return { boundary, boundaryError: error };
}
