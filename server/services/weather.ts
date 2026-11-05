/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Weather service: fetches from Open-Meteo with 15-minute in-memory TTL cache
 * and stale fallback if the upstream request fails.
 */

interface WeatherData {
  temp: number;
  condition: string;
  wind: number;
  humidity: number;
  forecast: string;
  craneHaltRisk: boolean;
  fetchedAt: number;
}

// Project site coordinates (Mumbai, India – example)
const SITE_LAT = 19.076;
const SITE_LON = 72.877;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const WIND_HALT_THRESHOLD_MPH = 20;

let cache: WeatherData | null = null;

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237);
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snow / Sleet';
  if (code <= 82) return 'Rain Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function buildForecast(condition: string, windMph: number, halt: boolean): string {
  if (halt) return '⚠ Crane operations suspended – high wind';
  if (condition.includes('Rain') || condition.includes('Thunder')) return 'Adverse conditions – monitor closely';
  if (windMph > 15) return 'Elevated wind – schedule lifts in morning window';
  return 'Ideal curing & framing conditions';
}

export async function fetchWeather(): Promise<WeatherData> {
  const now = Date.now();

  // Return cache if still fresh
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${SITE_LAT}&longitude=${SITE_LON}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&wind_speed_unit=ms&temperature_unit=celsius&timezone=auto`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);

    const json = await resp.json() as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
    };

    const c = json.current;
    const windMph = mpsToMph(c.wind_speed_10m);
    const condition = weatherCodeToCondition(c.weather_code);
    const halt = windMph > WIND_HALT_THRESHOLD_MPH;

    cache = {
      temp: celsiusToFahrenheit(c.temperature_2m),
      condition,
      wind: windMph,
      humidity: Math.round(c.relative_humidity_2m),
      forecast: buildForecast(condition, windMph, halt),
      craneHaltRisk: halt,
      fetchedAt: now,
    };

    return cache;
  } catch {
    // Return stale cache if available, otherwise return a safe default
    if (cache) return cache;
    return {
      temp: 78,
      condition: 'Data unavailable',
      wind: 0,
      humidity: 50,
      forecast: 'Weather data unavailable – using last known values',
      craneHaltRisk: false,
      fetchedAt: now,
    };
  }
}

export function getCachedWeather(): WeatherData | null {
  return cache;
}

