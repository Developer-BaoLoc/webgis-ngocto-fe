const LAYER_COLORS: Record<string, string> = {
  "administrative-boundary": "#1e40af",
  cooperatives: "#15803d",
  "cooperative-groups": "#16a34a",
  irrigation: "#0284c7",
  economic_collective: "#15803d",
  pump_station: "#0284c7",
  pump_service_area: "#0ea5e9",
  production_zone: "#ca8a04",
  ocop_subject: "#9333ea",
  administrative_zone: "#1e3a8a",
};

export function getLayerColor(id: string): string {
  if (LAYER_COLORS[id]) return LAYER_COLORS[id];

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
