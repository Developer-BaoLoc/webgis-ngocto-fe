export interface WeatherPresentation {
  label: string;
  icon: string;
}

/** WMO weather interpretation codes (Open-Meteo). */
export function describeWeatherCode(code: number): WeatherPresentation {
  if (code === 0) return { label: "Trời quang", icon: "☀️" };
  if (code === 1) return { label: "Ít mây", icon: "🌤️" };
  if (code === 2) return { label: "Có mây", icon: "⛅" };
  if (code === 3) return { label: "Nhiều mây", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Sương mù", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Mưa phùn", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Có mưa", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Có mưa", icon: "🌧️" };
  if (code >= 80 && code <= 82) return { label: "Mưa rào", icon: "🌧️" };
  if (code >= 85 && code <= 86) return { label: "Mưa tuyết", icon: "🌨️" };
  if (code >= 95 && code <= 99) return { label: "Dông bão", icon: "⛈️" };
  return { label: "Không xác định", icon: "🌡️" };
}
