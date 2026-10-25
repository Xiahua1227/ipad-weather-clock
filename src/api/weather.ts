import type { AirQualityApiResponse, WeatherApiResponse } from './types'

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { signal: controller.signal })
  }
  finally {
    clearTimeout(timer)
  }
}

export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherApiResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,wind_speed_10m,is_day,apparent_temperature,showers,relative_humidity_2m,precipitation,weather_code&hourly=precipitation_probability,uv_index,temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`

  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.statusText}`)
  }

  const data = await response.json() as WeatherApiResponse
  const currentHour = new Date().getHours()
  data.current_hour_index = currentHour

  return data
}

export async function fetchAirQualityData(lat: number, lon: number): Promise<AirQualityApiResponse> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`

  const response = await fetchWithTimeout(url)
  if (!response.ok) {
    throw new Error(`Air Quality API error: ${response.statusText}`)
  }

  const data = await response.json() as AirQualityApiResponse
  return data
}
