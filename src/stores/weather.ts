import type { CitySearchResult } from '../api/types'
import type { WeatherInfo } from '../types'
import { defineStore, storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { searchCities as searchCitiesApi } from '../api/geocoding'
import { getCurrentPosition, reverseGeocode as reverseGeocodeApi } from '../api/location'
import { fetchQweatherAirQualityData, fetchQweatherWeatherData } from '../api/qweather'
import { fetchAirQualityData, fetchWeatherData } from '../api/weather'
import { i18n } from '../i18n'
import { mapWmoCode } from '../utils/weather'
import { useConfigStore } from './config'

export type LocationMode = 'auto' | 'coords' | 'city'
export type WeatherDataSource = 'open-meteo' | 'qweather'
export type WeatherUpdateStatus = 'idle' | 'loading' | 'success' | 'stale' | 'error'

export const useWeatherStore = defineStore('weather', () => {
  const configStore = useConfigStore()
  const { language } = storeToRefs(configStore)

  // --- Persistent State ---
  const locationMode = ref<LocationMode>('auto')
  const customLat = ref(39.9)
  const customLon = ref(116.4)
  const customCity = ref('北京市')
  const refreshInterval = ref(20)
  const showRainEffect = ref(true)
  const showThunderEffect = ref(true)
  const showSnowEffect = ref(true)
  const dataSource = ref<WeatherDataSource>('open-meteo')
  const qweatherKey = ref('')
  const qweatherHost = ref('')

  // --- Runtime State ---
  const weatherData = ref<any>(null)
  const airQualityData = ref<any>(null)
  const loading = ref(false)
  const locationText = ref(i18n.global.t('weather.status.locating'))
  const weatherInfo = ref<WeatherInfo>({ text: i18n.global.t('weather.status.loading'), icon: mapWmoCode(-1).icon })
  const cachedCoords = ref<{ lat: number, lon: number, city: string } | null>(null)
  const lastUpdated = ref(0)
  const updateStatus = ref<WeatherUpdateStatus>('idle')
  const statusMessage = ref('等待天气更新')
  const testMode = ref(typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('test') || '')

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async function withDeadline<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), ms)
        }),
      ])
    }
    finally {
      if (timer) clearTimeout(timer)
    }
  }

  function validateWeatherData(data: any) {
    const current = data?.current
    if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
      throw new Error('Weather API returned invalid data')
    }
  }

  async function fetchWeather(lat: number, lon: number) {
    if (testMode.value === 'seed') {
      const hour = new Date().getHours()
      weatherData.value = {
        current: {
          temperature_2m: 18,
          rain: 0,
          wind_speed_10m: 8,
          is_day: 1,
          apparent_temperature: 17,
          showers: 0,
          relative_humidity_2m: 48,
          precipitation: 0,
          weather_code: 2,
        },
        hourly: {
          precipitation_probability: Array.from({ length: 24 }, () => 20),
          uv_index: Array.from({ length: 24 }, () => 2),
          temperature_2m: Array.from({ length: 24 }, () => 18),
        },
        daily: {
          time: [new Date().toISOString().slice(0, 10)],
          weather_code: [2],
          temperature_2m_max: [21],
          temperature_2m_min: [10],
          precipitation_probability_max: [20],
        },
        current_hour_index: hour,
      }
      airQualityData.value = { current: { us_aqi: 42 } }
      weatherInfo.value = mapWmoCode(2, true)
      return
    }
    if (testMode.value === 'offline') throw new Error('Simulated offline mode')
    if (testMode.value === 'timeout') {
      await delay(1600)
      throw new Error('Simulated request timeout')
    }
    if (testMode.value === 'empty') throw new Error('Simulated empty weather response')

    const useQweather = dataSource.value === 'qweather'
    const qweatherOptions = {
      key: qweatherKey.value.trim(),
      host: qweatherHost.value.trim(),
      lang: language.value,
    }

    if (useQweather && (!qweatherOptions.key || !qweatherOptions.host)) {
      throw new Error(i18n.global.t('weather.status.missingKey'))
    }

    const weatherPromise = useQweather
      ? fetchQweatherWeatherData(lat, lon, qweatherOptions)
      : fetchWeatherData(lat, lon)
    const aqiPromise = (useQweather
      ? fetchQweatherAirQualityData(lat, lon, qweatherOptions)
      : fetchAirQualityData(lat, lon))
      .catch((error) => {
        console.error('Air Quality API error:', error)
        return null
      })

    const nextWeather = await weatherPromise
    validateWeatherData(nextWeather)
    weatherData.value = nextWeather
    weatherInfo.value = mapWmoCode(nextWeather.current.weather_code, nextWeather.current.is_day === 1)

    const nextAirQuality = await aqiPromise
    if (nextAirQuality) airQualityData.value = nextAirQuality
  }

  async function fetchWeatherWithRetry(lat: number, lon: number) {
    try {
      await withDeadline(fetchWeather(lat, lon), 9000, 'Weather request timed out')
    }
    catch (error) {
      if (testMode.value) throw error
      await delay(900)
      await withDeadline(fetchWeather(lat, lon), 9000, 'Weather retry timed out')
    }
  }

  function extractSimplifiedChinese(text: string): string {
    if (!text) return text
    const parts = text.split(';')
    if (parts.length > 1) {
      return parts[0].trim()
    }
    return text
  }

  function cleanDisplayName(displayName: string): string {
    if (!displayName) return displayName
    return displayName
      .split(',')
      .map(part => extractSimplifiedChinese(part))
      .join(', ')
  }

  async function searchCities(query: string): Promise<CitySearchResult[]> {
    try {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) {
        return []
      }

      const results = await searchCitiesApi(trimmedQuery, 3, language.value)
      if (results.length > 0) {
        return results.map((r) => {
          const rawName = r.address?.city || ''
          const rawDisplayName = r.display_name || ''
          const cityName = extractSimplifiedChinese(rawName.split(',')[0] || rawName)
          const displayName = cleanDisplayName(rawDisplayName)

          return {
            name: cityName || trimmedQuery,
            displayName: displayName || cityName || trimmedQuery,
            latitude: Number.parseFloat(r.lat),
            longitude: Number.parseFloat(r.lon),
          }
        })
      }
      return []
    }
    catch (e) {
      return []
    }
  }

  async function getCurrentCoords(): Promise<{ lat: number, lon: number }> {
    if (locationMode.value === 'coords') {
      return { lat: customLat.value, lon: customLon.value }
    }

    if (locationMode.value === 'city') {
      const results = await searchCities(customCity.value)
      if (results.length > 0) {
        return { lat: results[0].latitude, lon: results[0].longitude }
      }
      return { lat: 39.9, lon: 116.4 }
    }

    if (cachedCoords.value) {
      return { lat: cachedCoords.value.lat, lon: cachedCoords.value.lon }
    }

    return { lat: 39.9, lon: 116.4 }
  }

  async function reverseGeocode(lat: number, lon: number) {
    try {
      const data = await reverseGeocodeApi(lat, lon, language.value)
      const city = data.city || data.locality || data.principalSubdivision || i18n.global.t('weather.status.unknownCity')
      return city
    }
    catch (e) {
      return `${lon.toFixed(2)}, ${lat.toFixed(2)}`
    }
  }

  async function updateWeather(): Promise<boolean> {
    loading.value = true
    updateStatus.value = 'loading'
    statusMessage.value = weatherData.value ? '正在更新天气' : '正在获取天气'
    if (!weatherData.value) {
      weatherInfo.value.text = i18n.global.t('weather.status.loading')
      locationText.value = i18n.global.t('weather.status.locating')
    }

    let lat = 39.9
    let lon = 116.4
    let fallbackUsed = false

    try {
      if (locationMode.value === 'coords') {
        cachedCoords.value = null
        lat = customLat.value
        lon = customLon.value
        locationText.value = await reverseGeocode(lat, lon)
      }
      else if (locationMode.value === 'city') {
        cachedCoords.value = null
        const city = customCity.value.trim()
        if (!city) throw new Error(i18n.global.t('weather.status.cityEmpty'))
        const results = await searchCities(city)
        if (!results.length) throw new Error('未找到该城市')
        lat = results[0].latitude
        lon = results[0].longitude
        locationText.value = results[0].name
      }
      else if (testMode.value && testMode.value !== 'location-error') {
        lat = 39.9
        lon = 116.4
        locationText.value = '测试位置 · 北京'
      }
      else if (cachedCoords.value && testMode.value !== 'location-error') {
        lat = cachedCoords.value.lat
        lon = cachedCoords.value.lon
        locationText.value = cachedCoords.value.city
      }
      else {
        if (testMode.value === 'location-error') throw new Error('Simulated location error')
        const coords = await withDeadline(
          getCurrentPosition(5000, language.value),
          8000,
          'Location request timed out',
        )
        lat = coords.latitude
        lon = coords.longitude
        let cityName = '当前位置'
        try {
          cityName = await withDeadline(reverseGeocode(lat, lon), 3000, 'Reverse geocoding timed out')
        }
        catch {
          // 地名解析失败不应阻塞天气数据请求。
        }
        locationText.value = cityName
        cachedCoords.value = { lat, lon, city: cityName }
      }
    }
    catch (error) {
      if (locationMode.value !== 'auto') {
        updateStatus.value = weatherData.value ? 'stale' : 'error'
        statusMessage.value = weatherData.value ? '位置无效，正在显示上次数据' : '无法获取所选城市'
        loading.value = false
        return false
      }
      fallbackUsed = true
      lat = 39.9
      lon = 116.4
      locationText.value = '北京（定位不可用）'
      cachedCoords.value = { lat, lon, city: locationText.value }
    }

    try {
      await fetchWeatherWithRetry(lat, lon)
      lastUpdated.value = Date.now()
      updateStatus.value = 'success'
      const time = new Date(lastUpdated.value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
      statusMessage.value = fallbackUsed ? `定位不可用，已使用北京 · ${time}` : `天气已更新 · ${time}`
      return true
    }
    catch (error) {
      console.error('Update weather failed:', error)
      updateStatus.value = weatherData.value ? 'stale' : 'error'
      statusMessage.value = weatherData.value ? '更新失败，正在显示上次数据' : '天气获取失败，请稍后重试'
      if (!weatherData.value) {
        weatherInfo.value.text = i18n.global.t('weather.status.apiError')
        weatherInfo.value.icon = mapWmoCode(-1).icon
      }
      return false
    }
    finally {
      loading.value = false
    }
  }

  // 模式切换同步清理
  watch(locationMode, (newMode) => {
    if (newMode === 'auto') {
      cachedCoords.value = null
      locationText.value = i18n.global.t('weather.status.locating')
    }
  }, { flush: 'sync' })

  watch(() => i18n.global.locale.value, () => {
    if (weatherData.value?.current) {
      weatherInfo.value = mapWmoCode(weatherData.value.current.weather_code, weatherData.value.current.is_day === 1)
    }
    if (loading.value) {
      weatherInfo.value.text = i18n.global.t('weather.status.loading')
      locationText.value = i18n.global.t('weather.status.locating')
    }
  })

  return {
    // Persistent
    locationMode,
    customLat,
    customLon,
    customCity,
    refreshInterval,
    showRainEffect,
    showThunderEffect,
    showSnowEffect,
    dataSource,
    qweatherKey,
    qweatherHost,
    // Runtime
    weatherData,
    loading,
    locationText,
    weatherInfo,
    airQualityData,
    lastUpdated,
    statusMessage,
    testMode,
    updateStatus,
    // Actions
    updateWeather,
    searchCities,
    getCurrentCoords,
  }
}, {
  persist: {
    pick: [
      'locationMode',
      'customLat',
      'customLon',
      'customCity',
      'refreshInterval',
      'showRainEffect',
      'showThunderEffect',
      'showSnowEffect',
      'dataSource',
      'qweatherKey',
      'qweatherHost',
      'weatherData',
      'airQualityData',
      'weatherInfo',
      'locationText',
      'lastUpdated',
    ],
  },
})
