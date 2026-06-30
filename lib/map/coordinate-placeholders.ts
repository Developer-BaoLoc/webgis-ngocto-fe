import { wardConfig } from "@/config/ward.config";

function formatCoordinate(value: number) {
  return Number.isFinite(value) ? String(Number(value.toFixed(6))) : "";
}

export function getCoordinatePlaceholders() {
  return {
    lat: formatCoordinate(wardConfig.center.lat),
    lng: formatCoordinate(wardConfig.center.lng),
  };
}
