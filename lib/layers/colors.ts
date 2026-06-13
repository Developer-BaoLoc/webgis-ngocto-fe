const LAYER_COLORS: Record<string, string> = {
  economic_collective: "#15803d",
  pump_station: "#0284c7",
  production_zone: "#ca8a04",
  ocop_subject: "#9333ea",
  ocop_product: "#7c3aed",
  administrative_zone: "#1e40af",
};

export function getLayerColor(code: string): string {
  if (LAYER_COLORS[code]) return LAYER_COLORS[code];

  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
