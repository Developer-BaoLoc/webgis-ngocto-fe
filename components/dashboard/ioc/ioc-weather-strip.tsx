"use client";

import { useEffect, useState } from "react";
import { describeWeatherCode } from "@/lib/weather/weather-codes";

interface IocWeatherStripProps {
  lat: number;
  lng: number;
}

interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

const REFRESH_MS = 30 * 60 * 1000;

async function fetchWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    timezone: "Asia/Bangkok",
    forecast_days: "1",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("weather_fetch_failed");

  const json = (await res.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      weather_code: number;
      wind_speed_10m: number;
    };
  };

  return {
    temperature: json.current.temperature_2m,
    humidity: json.current.relative_humidity_2m,
    windSpeed: json.current.wind_speed_10m,
    weatherCode: json.current.weather_code,
  };
}

export function IocWeatherStrip({ lat, lng }: IocWeatherStripProps) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchWeather(lat, lng);
        if (!cancelled) {
          setWeather(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [lat, lng]);

  if (error) {
    return (
      <div className="ioc-weather-strip ioc-weather-strip--error" aria-label="Thời tiết">
        <span className="ioc-weather-icon-badge" aria-hidden>
          🌡️
        </span>
        <span className="ioc-weather-muted">Không tải được thời tiết</span>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="ioc-weather-strip ioc-weather-strip--loading" aria-label="Đang tải thời tiết">
        <span className="ioc-weather-skeleton ioc-weather-skeleton--icon" />
        <span className="ioc-weather-skeleton ioc-weather-skeleton--temp" />
        <span className="ioc-weather-skeleton ioc-weather-skeleton--text" />
      </div>
    );
  }

  const presentation = describeWeatherCode(weather.weatherCode);

  return (
    <div className="ioc-weather-strip" role="status" aria-label="Thời tiết hiện tại">
      <span className="ioc-weather-icon-badge" aria-hidden>
        {presentation.icon}
      </span>

      <span className="ioc-weather-temp">{Math.round(weather.temperature)}°C</span>

      <span className="ioc-weather-divider" aria-hidden />

      <p className="ioc-weather-summary">
        <strong>{presentation.label}</strong>
      </p>

      <span className="ioc-weather-divider" aria-hidden />

      <span className="ioc-weather-chip" title="Độ ẩm">
        <span className="ioc-weather-chip-icon" aria-hidden>
          💧
        </span>
        {Math.round(weather.humidity)}%
      </span>

      <span className="ioc-weather-chip" title="Gió">
        <span className="ioc-weather-chip-icon" aria-hidden>
          🌬️
        </span>
        {Math.round(weather.windSpeed)} km/h
      </span>
    </div>
  );
}
