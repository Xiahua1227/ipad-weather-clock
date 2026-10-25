<script setup lang="ts">
import { CloudRain, Droplets, Settings, Thermometer, Wind } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, watch, watchEffect } from 'vue'
import { useTime } from '../hooks/useTime'
import { useConfigStore } from '../stores/config'
import { useWeatherStore } from '../stores/weather'
import { getAqiInfo } from '../utils/weather'

const configStore = useConfigStore()
const { showDrawer, activeTab, dashboardConfig } = storeToRefs(configStore)
const weatherStore = useWeatherStore()
const { airQualityData, loading, refreshInterval, statusMessage, testMode, updateStatus, weatherData, weatherInfo } = storeToRefs(weatherStore)
const { lunar, now } = useTime()

interface WeatherDisplay {
  icon: string
  temperature: number | string
  condition: string
  high: number | string
  low: number | string
  precipitation: number | string
  humidity: number | string
  feelsLike: number | string
  aqiText: string
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\.\//, '').replace(/^\//, '')}`

const weatherDemos: Record<string, WeatherDisplay> = {
  cloudy: { icon: publicAsset('weather-icons/partly-cloudy-day.svg'), temperature: 18, condition: '多云', high: 21, low: 10, precipitation: 20, humidity: 48, feelsLike: 17, aqiText: '优 42' },
  clear: { icon: publicAsset('weather-icons/clear-day.svg'), temperature: 7, condition: '晴', high: 12, low: 3, precipitation: 5, humidity: 48, feelsLike: 6, aqiText: '优 42' },
  rain: { icon: publicAsset('weather-icons/rain.svg'), temperature: 9, condition: '小雨', high: 11, low: 6, precipitation: 75, humidity: 82, feelsLike: 7, aqiText: '优 36' },
  storm: { icon: publicAsset('weather-icons/thunderstorms-day-rain.svg'), temperature: 8, condition: '雷阵雨', high: 10, low: 5, precipitation: 85, humidity: 88, feelsLike: 6, aqiText: '良 58' },
  snow: { icon: publicAsset('weather-icons/snow.svg'), temperature: -3, condition: '小雪', high: 1, low: -7, precipitation: 60, humidity: 76, feelsLike: -7, aqiText: '优 30' },
  night: { icon: publicAsset('weather-icons/clear-night.svg'), temperature: 4, condition: '晴', high: 8, low: 0, precipitation: 0, humidity: 52, feelsLike: 2, aqiText: '优 40' },
}

const queryParams = new URLSearchParams(window.location.search)
const requestedDemo = queryParams.get('demo')
const demoKey = requestedDemo || 'cloudy'
const isDemoMode = Boolean(requestedDemo)
const themeKey = queryParams.get('theme')
const weatherTips: Record<string, string> = {
  cloudy: '今天无明显降雨',
  clear: '天气晴朗，适宜外出',
  rain: '降雨概率较高，记得带伞',
  storm: '注意雷电和短时强降雨',
  snow: '注意保暖和路面湿滑',
  night: '夜间天气晴朗',
}

const weatherVisualKey = computed(() => {
  if (isDemoMode) return demoKey

  const code = weatherData.value?.current?.weather_code
  const day = weatherData.value?.current?.is_day === 1
  if (code === 0) return day ? 'clear' : 'night'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 95) return 'storm'
  return 'cloudy'
})

const weatherDisplay = computed<WeatherDisplay>(() => {
  if (isDemoMode) return weatherDemos[demoKey] || weatherDemos.cloudy

  const current = weatherData.value?.current
  const daily = weatherData.value?.daily
  const hourly = weatherData.value?.hourly
  const hourIndex = weatherData.value?.current_hour_index ?? now.value.getHours()
  const aqi = airQualityData.value?.current?.us_aqi
  const aqiInfo = getAqiInfo(aqi)

  return {
    icon: publicAsset(weatherInfo.value.icon || 'weather-icons/not-available.svg'),
    temperature: current ? Math.round(current.temperature_2m) : '--',
    condition: weatherInfo.value.text,
    high: daily?.temperature_2m_max?.[0] === undefined ? '--' : Math.round(daily.temperature_2m_max[0]),
    low: daily?.temperature_2m_min?.[0] === undefined ? '--' : Math.round(daily.temperature_2m_min[0]),
    precipitation: hourly?.precipitation_probability?.[hourIndex] === undefined ? '--' : Math.round(hourly.precipitation_probability[hourIndex]),
    humidity: current ? Math.round(current.relative_humidity_2m) : '--',
    feelsLike: current ? Math.round(current.apparent_temperature) : '--',
    aqiText: aqi === undefined ? '--' : `${aqiInfo.label} ${Math.round(aqi)}`,
  }
})

const weatherTip = computed(() => {
  if (isDemoMode) return weatherTips[demoKey] || weatherTips.cloudy
  if (loading.value && !weatherData.value) return '正在获取天气数据'

  const code = weatherData.value?.current?.weather_code ?? -1
  const precipitation = Number(weatherDisplay.value.precipitation)
  if (code >= 95) return '注意雷电和短时强降雨'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '注意保暖和路面湿滑'
  if (precipitation >= 60) return '降雨概率较高，记得带伞'
  if (code === 0) return '天气晴朗，适宜外出'
  return '今天无明显降雨'
})

const hourLabel = computed(() => String(now.value.getHours()).padStart(2, '0'))
const minuteLabel = computed(() => String(now.value.getMinutes()).padStart(2, '0'))
const timeLabel = computed(() => `${hourLabel.value}:${minuteLabel.value}`)

const dateLabel = computed(() => `${now.value.getMonth() + 1}月${now.value.getDate()}日`)
const weekdayLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now.value))
const lunarLabel = computed(() => `农历${lunar.value.month}月${lunar.value.date}`)
const isNight = computed(() => {
  if (themeKey === 'day') return false
  if (themeKey === 'night') return true
  if (dashboardConfig.value.themeMode === 'day') return false
  if (dashboardConfig.value.themeMode === 'night') return true
  if (!isDemoMode && weatherData.value?.current) return weatherData.value.current.is_day !== 1
  return now.value.getHours() < 7 || now.value.getHours() >= 19
})

const clockColor = computed(() => dashboardConfig.value.clockColor === 'auto'
  ? 'var(--ink)'
  : dashboardConfig.value.clockColor)

watchEffect(() => {
  const themeColor = isNight.value ? '#000000' : '#f5f3ee'
  const statusBarStyle = isNight.value ? 'black' : 'default'

  document.documentElement.style.backgroundColor = themeColor
  document.body.style.backgroundColor = themeColor
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor)
  document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', statusBarStyle)
})

let refreshTimer: ReturnType<typeof setInterval> | undefined

function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  if (isDemoMode) return
  refreshTimer = setInterval(() => {
    void weatherStore.updateWeather()
  }, Math.max(5, refreshInterval.value) * 60 * 1000)
}

onMounted(() => {
  if (isDemoMode) return
  void weatherStore.updateWeather()
  scheduleRefresh()
})

watch(refreshInterval, scheduleRefresh)

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

function openSettings() {
  activeTab.value = 'general'
  showDrawer.value = true
}
</script>

<template>
  <section class="preview-shell" :class="{ 'night-theme': isNight }">
    <div class="dashboard-stage">
      <header class="dashboard-header">
        <div class="date-group">
          <span>{{ dateLabel }}</span>
          <span>{{ weekdayLabel }}</span>
        </div>
        <span v-if="dashboardConfig.showLunar" class="lunar-label">{{ lunarLabel }}</span>
      </header>

      <div class="dashboard-content">
        <div class="hero-row">
          <section class="layout-frame time-frame" aria-label="时间区">
            <time class="clock-time" :aria-label="timeLabel" :style="{ color: clockColor }">
              <span class="clock-digits">{{ hourLabel }}</span>
              <span class="clock-colon" aria-hidden="true"><i /><i /></span>
              <span class="clock-digits">{{ minuteLabel }}</span>
            </time>
          </section>

          <section class="layout-frame weather-hero" aria-label="天气区">
            <div class="weather-stack">
              <img
                :class="['weather-icon', `weather-icon--${weatherVisualKey}`]"
                :src="weatherDisplay.icon"
                :alt="weatherDisplay.condition"
              >
              <div class="weather-summary">
                <div class="temperature">
                  {{ weatherDisplay.temperature }}<span>°</span>
                </div>
                <div class="weather-copy">
                  <span class="condition">{{ weatherDisplay.condition }}</span>
                  <span class="range">{{ weatherDisplay.high }}° / {{ weatherDisplay.low }}°</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="bottom-row">
          <section class="metrics-row" aria-label="环境指标区">
            <div v-if="dashboardConfig.showPrecipitation" class="metric-card metric-card--air">
              <Wind class="metric-icon" />
              <span class="metric-name">空气质量</span>
              <strong>{{ weatherDisplay.aqiText }}</strong>
            </div>
            <div class="metric-card metric-card--humidity">
              <Droplets class="metric-icon" />
              <span class="metric-name">湿度</span>
              <strong>{{ weatherDisplay.humidity }}%</strong>
            </div>
            <div class="metric-card metric-card--feels-like">
              <Thermometer class="metric-icon" />
              <span class="metric-name">体感温度</span>
              <strong>{{ weatherDisplay.feelsLike }}°</strong>
            </div>
            <div class="metric-card metric-card--rain">
              <CloudRain class="metric-icon" />
              <span class="metric-name">降雨概率</span>
              <strong>{{ weatherDisplay.precipitation }}%</strong>
            </div>
          </section>

          <aside v-if="dashboardConfig.showTip" class="notice-area" aria-label="今日提示">
            <span>今日提示</span>
            <strong>{{ weatherTip }}</strong>
          </aside>
        </div>
      </div>

      <button class="settings-button" aria-label="打开设置" @click.stop="openSettings">
        <Settings />
      </button>
      <div
        v-if="!isDemoMode && (testMode || updateStatus === 'stale' || updateStatus === 'error')"
        class="data-status"
        :class="{ warning: updateStatus === 'stale' || updateStatus === 'error' }"
      >
        <span v-if="testMode">测试：{{ testMode }}</span>
        {{ statusMessage }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-shell {
  --surface: #f5f3ee;
  --ink: #111111;
  --muted: #686661;
  display: flex;
  width: 100vw;
  height: 100vh;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--surface);
  color: var(--ink);
}

.preview-shell.night-theme {
  --page-bg: #000000;
  --surface: #000000;
  --ink: #f4f4f2;
  --muted: #9a9a96;
}

.dashboard-stage {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 4.8% 6.4% 4.2%;
  overflow: hidden;
  background: var(--surface);
}

.dashboard-header {
  display: flex;
  height: 14.5%;
  align-items: flex-start;
  justify-content: space-between;
  color: var(--muted);
  font-size: min(3.05vw, 4.05vh);
  font-weight: 500;
  letter-spacing: 0.025em;
}

.date-group {
  display: flex;
  gap: 1.35em;
  white-space: nowrap;
}

.lunar-label {
  white-space: nowrap;
}

.dashboard-content {
  display: grid;
  height: 78%;
  grid-template-rows: 67% 25%;
  gap: 8%;
}

.hero-row {
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
  gap: 1.5%;
  transform: scale(1.037);
  transform-origin: left center;
}

.layout-frame {
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  border: 0;
  background: transparent;
  overflow: hidden;
}

.time-frame {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 3% 0 1%;
}

.clock-time {
  display: inline-flex;
  align-items: center;
  gap: 0.045em;
  color: var(--ink);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: min(32.1vw, 42.8vh);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 0.78;
  white-space: nowrap;
  transform: translateX(-0.04em);
}

.clock-digits {
  letter-spacing: -0.045em;
}

.clock-colon {
  display: inline-flex;
  width: 0.105em;
  height: 0.37em;
  flex: 0 0 0.105em;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transform: translate(0.018em, 0.045em);
}

.clock-colon i {
  display: block;
  width: 0.105em;
  height: 0.105em;
  border-radius: 50%;
  background: currentColor;
}

.weather-hero {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5% 0 2% 5%;
}

.weather-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: min(1vw, 1.35vh);
  transform: translateY(-1.55vw);
}

.weather-icon {
  display: block;
  width: min(24.5vw, 32.7vh);
  height: min(24.5vw, 32.7vh);
  margin-bottom: -4vw;
  object-fit: contain;
  transform: translateX(3.5%);
}

.preview-shell:not(.night-theme) .weather-icon:not(.weather-icon--clear):not(.weather-icon--night) {
  filter:
    drop-shadow(0 0 min(0.11vw, 0.15vh) rgba(94, 116, 143, 0.42))
    drop-shadow(0 min(0.2vw, 0.27vh) min(0.36vw, 0.48vh) rgba(67, 88, 115, 0.16));
}

.weather-icon--clear {
  width: min(22.7vw, 30.25vh);
  height: min(22.7vw, 30.25vh);
  margin-bottom: -2.5vw;
}

.weather-icon--rain,
.weather-icon--snow {
  transform: translate(3.5%, -0.6vw);
}

.weather-summary {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: min(1.25vw, 1.65vh);
}

.temperature {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: min(9.6vw, 12.8vh);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.035em;
  line-height: 0.78;
  white-space: nowrap;
}

.temperature span {
  display: inline-block;
  margin-left: 0.02em;
  font-size: 0.5em;
  vertical-align: top;
}

.weather-copy {
  display: flex;
  flex-direction: column;
  gap: min(0.45vw, 0.6vh);
  padding-bottom: 0.08em;
  color: var(--muted);
  white-space: nowrap;
}

.condition {
  font-size: min(2.45vw, 3.25vh);
}

.range {
  font-size: min(1.65vw, 2.2vh);
}

.bottom-row {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
  align-items: center;
  gap: 7%;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  grid-template-rows: repeat(2, minmax(0, 1fr));
  justify-content: start;
  column-gap: min(4.8vw, 6.4vh);
  row-gap: min(1.4vw, 1.85vh);
}

.metric-card {
  display: flex;
  width: max-content;
  min-width: 0;
  align-items: center;
  gap: 0.65em;
  justify-self: start;
  box-sizing: border-box;
  padding: 0;
  background: transparent;
  color: var(--muted);
  font-size: min(2.12vw, 2.82vh);
  line-height: 1;
}

.notice-area {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: min(0.62vw, 0.82vh);
  color: var(--muted);
  text-align: right;
}

.notice-area span {
  font-size: min(1.5vw, 2vh);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.notice-area strong {
  max-width: 100%;
  color: var(--ink);
  font-size: min(2.12vw, 2.82vh);
  font-weight: 500;
  line-height: 1.22;
  overflow-wrap: anywhere;
}

.metric-icon {
  width: 1em;
  height: 1em;
  color: var(--metric-icon-color);
  stroke-width: 1.7;
}

.metric-card--air {
  --metric-icon-color: #21a879;
}

.metric-card--humidity {
  --metric-icon-color: #2589df;
}

.metric-card--feels-like {
  --metric-icon-color: #e98523;
}

.metric-card--rain {
  --metric-icon-color: #5c6ee5;
}

.night-theme .metric-card--air {
  --metric-icon-color: #4dd3a1;
}

.night-theme .metric-card--humidity {
  --metric-icon-color: #5ab6ff;
}

.night-theme .metric-card--feels-like {
  --metric-icon-color: #ffac4a;
}

.night-theme .metric-card--rain {
  --metric-icon-color: #8392ff;
}

.metric-name {
  white-space: nowrap;
}

.metric-card strong {
  color: var(--ink);
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.settings-button {
  position: absolute;
  top: 2.6%;
  right: 2.6%;
  display: grid;
  width: min(3vw, 4vh);
  height: min(3vw, 4vh);
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.12);
  color: var(--muted);
  cursor: pointer;
}

.settings-button svg {
  width: 56%;
  height: 56%;
}

.data-status {
  position: absolute;
  top: 2.6%;
  right: 7%;
  max-width: 40%;
  padding: 0.42em 0.72em;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.1);
  color: var(--muted);
  font-size: min(1.15vw, 1.52vh);
  line-height: 1;
  white-space: nowrap;
}

.data-status span {
  margin-right: 0.6em;
  font-weight: 650;
}

.data-status.warning {
  background: rgba(180, 83, 60, 0.12);
  color: #a04b38;
}
</style>
