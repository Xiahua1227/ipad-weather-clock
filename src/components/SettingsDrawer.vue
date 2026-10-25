<script setup lang="ts">
import type { CitySearchResult } from '../api/types'
import { Check, ChevronDown, LocateFixed, RefreshCw, RotateCcw, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useConfigStore } from '../stores/config'
import { useWeatherStore } from '../stores/weather'

const configStore = useConfigStore()
const weatherStore = useWeatherStore()
const { dashboardConfig, showDrawer } = storeToRefs(configStore)
const { lastUpdated, loading, locationText, statusMessage, testMode, updateStatus } = storeToRefs(weatherStore)

const themeOptions = [
  { value: 'auto', label: '自动' },
  { value: 'day', label: '浅色' },
  { value: 'night', label: '深色' },
] as const
const refreshOptions = [20, 30, 60]
const colorPresets = ['#111111', '#f4f4f2', '#355c7d', '#b4533c', '#6b705c']

const draft = ref(createDraft())
const citySearchQuery = ref('')
const citySearchResults = ref<CitySearchResult[]>([])
const citySearchLoading = ref(false)
const showSearchResults = ref(false)
const saving = ref(false)
const saveFeedback = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const lastUpdatedText = computed(() => lastUpdated.value
  ? new Date(lastUpdated.value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  : '尚未成功更新')

function createDraft() {
  return {
    themeMode: dashboardConfig.value.themeMode,
    clockColor: dashboardConfig.value.clockColor,
    showLunar: dashboardConfig.value.showLunar,
    showTip: dashboardConfig.value.showTip,
    showPrecipitation: dashboardConfig.value.showPrecipitation,
    locationMode: weatherStore.locationMode === 'city' ? 'city' as const : 'auto' as const,
    customCity: weatherStore.customCity,
    customLat: weatherStore.customLat,
    customLon: weatherStore.customLon,
    refreshInterval: weatherStore.refreshInterval,
    dataSource: weatherStore.dataSource,
    qweatherKey: weatherStore.qweatherKey,
    qweatherHost: weatherStore.qweatherHost,
  }
}

function resetDraft() {
  draft.value = createDraft()
  citySearchQuery.value = draft.value.customCity || ''
  citySearchResults.value = []
}

watch(showDrawer, (open) => {
  if (open) {
    resetDraft()
    saveFeedback.value = ''
  }
})

function closeDrawer() {
  showDrawer.value = false
}

function restoreRecommended() {
  draft.value = {
    ...draft.value,
    themeMode: 'auto',
    clockColor: 'auto',
    showLunar: true,
    showTip: true,
    showPrecipitation: true,
    locationMode: 'auto',
    refreshInterval: 20,
    dataSource: 'open-meteo',
  }
  citySearchQuery.value = ''
}

async function saveSettings() {
  dashboardConfig.value = {
    themeMode: draft.value.themeMode,
    clockColor: draft.value.clockColor,
    showLunar: draft.value.showLunar,
    showTip: draft.value.showTip,
    showPrecipitation: draft.value.showPrecipitation,
  }
  weatherStore.$patch({
    locationMode: draft.value.locationMode,
    customCity: draft.value.customCity,
    customLat: draft.value.customLat,
    customLon: draft.value.customLon,
    refreshInterval: draft.value.refreshInterval,
    dataSource: draft.value.dataSource,
    qweatherKey: draft.value.qweatherKey,
    qweatherHost: draft.value.qweatherHost,
  })
  saving.value = true
  const success = await weatherStore.updateWeather()
  saving.value = false
  saveFeedback.value = success ? '设置已保存，天气已更新' : `设置已保存 · ${statusMessage.value}`
  if (success) setTimeout(closeDrawer, 900)
}

function handleCitySearch() {
  if (searchTimer) clearTimeout(searchTimer)
  const query = citySearchQuery.value.trim()
  draft.value.customCity = query
  if (!query) {
    citySearchResults.value = []
    showSearchResults.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    citySearchLoading.value = true
    citySearchResults.value = await weatherStore.searchCities(query)
    showSearchResults.value = true
    citySearchLoading.value = false
  }, 450)
}

function selectCity(city: CitySearchResult) {
  draft.value.customCity = city.name
  draft.value.customLat = city.latitude
  draft.value.customLon = city.longitude
  citySearchQuery.value = city.name
  showSearchResults.value = false
}

function setCustomColor(event: Event) {
  draft.value.clockColor = (event.target as HTMLInputElement).value
}
</script>

<template>
  <div v-if="showDrawer" class="settings-overlay" @click.self="closeDrawer" @touchmove.stop>
    <aside class="settings-panel" aria-label="天气时钟设置">
      <header class="settings-header">
        <div>
          <p>天气时钟</p>
          <h2>设置</h2>
        </div>
        <button class="icon-button" aria-label="关闭设置" @click="closeDrawer"><X /></button>
      </header>

      <div class="settings-scroll">
        <div v-if="testMode" class="test-banner">测试模式：{{ testMode }}</div>
        <section class="settings-section">
          <div class="section-heading">
            <h3>显示</h3>
            <span>保存后应用</span>
          </div>

          <label class="field-label">主题</label>
          <div class="segmented-control">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              :class="{ active: draft.themeMode === option.value }"
              @click="draft.themeMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <label class="field-label">时钟颜色</label>
          <div class="color-row">
            <button class="auto-color" :class="{ selected: draft.clockColor === 'auto' }" @click="draft.clockColor = 'auto'">自动</button>
            <button
              v-for="color in colorPresets"
              :key="color"
              class="color-swatch"
              :class="{ selected: draft.clockColor === color }"
              :style="{ '--swatch': color }"
              :aria-label="`选择颜色 ${color}`"
              @click="draft.clockColor = color"
            >
              <Check v-if="draft.clockColor === color" />
            </button>
            <label class="custom-color" aria-label="选择自定义颜色">
              <span>＋</span>
              <input type="color" :value="draft.clockColor === 'auto' ? '#111111' : draft.clockColor" @input="setCustomColor">
            </label>
          </div>

          <div class="toggle-list">
            <button class="toggle-row" @click="draft.showLunar = !draft.showLunar">
              <span>显示农历</span><i :class="{ active: draft.showLunar }"><b /></i>
            </button>
            <button class="toggle-row" @click="draft.showTip = !draft.showTip">
              <span>显示今日提示</span><i :class="{ active: draft.showTip }"><b /></i>
            </button>
            <button class="toggle-row" @click="draft.showPrecipitation = !draft.showPrecipitation">
              <span>显示降雨概率</span><i :class="{ active: draft.showPrecipitation }"><b /></i>
            </button>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-heading">
            <h3>位置与天气</h3>
            <span>{{ locationText }}</span>
          </div>

          <label class="field-label">位置</label>
          <div class="segmented-control two-columns">
            <button :class="{ active: draft.locationMode === 'auto' }" @click="draft.locationMode = 'auto'">自动定位</button>
            <button :class="{ active: draft.locationMode === 'city' }" @click="draft.locationMode = 'city'">手动城市</button>
          </div>

          <div v-if="draft.locationMode === 'city'" class="city-search">
            <LocateFixed />
            <input
              v-model="citySearchQuery"
              type="text"
              placeholder="输入城市，例如北京"
              @input="handleCitySearch"
              @focus="showSearchResults = citySearchResults.length > 0"
            >
            <RefreshCw v-if="citySearchLoading" class="spin" />
            <div v-if="showSearchResults && citySearchResults.length" class="search-results">
              <button v-for="city in citySearchResults" :key="`${city.latitude}-${city.longitude}`" @click="selectCity(city)">
                <strong>{{ city.name }}</strong><span>{{ city.displayName }}</span>
              </button>
            </div>
          </div>

          <label class="field-label">自动刷新</label>
          <div class="segmented-control">
            <button
              v-for="minutes in refreshOptions"
              :key="minutes"
              :class="{ active: draft.refreshInterval === minutes }"
              @click="draft.refreshInterval = minutes"
            >
              {{ minutes }} 分钟
            </button>
          </div>

          <div class="weather-status" :class="{ warning: updateStatus === 'stale' || updateStatus === 'error' }">
            <div><span>数据状态</span><strong>{{ statusMessage }}</strong></div>
            <div><span>最后更新</span><strong>{{ lastUpdatedText }}</strong></div>
          </div>

          <details class="advanced-settings">
            <summary><span>高级设置</span><ChevronDown /></summary>
            <div class="advanced-content">
              <label class="field-label">天气来源</label>
              <div class="segmented-control two-columns">
                <button :class="{ active: draft.dataSource === 'open-meteo' }" @click="draft.dataSource = 'open-meteo'">Open-Meteo</button>
                <button :class="{ active: draft.dataSource === 'qweather' }" @click="draft.dataSource = 'qweather'">和风天气</button>
              </div>
              <template v-if="draft.dataSource === 'qweather'">
                <input v-model="draft.qweatherKey" class="text-input" type="password" placeholder="和风天气 API Key">
                <input v-model="draft.qweatherHost" class="text-input" type="text" placeholder="API Host">
                <p class="field-note">和风天气需要自行注册并填写凭据；默认的 Open-Meteo 无需注册。</p>
              </template>
            </div>
          </details>
        </section>

        <section class="settings-section about-section">
          <div class="section-heading">
            <h3>关于与许可</h3>
            <span>一期本地版 0.1.0</span>
          </div>
          <p>
            本项目是
            <a href="https://github.com/teojs/clock-dashboard" target="_blank" rel="noopener noreferrer">teojs/clock-dashboard</a>
            的非商业衍生版本，基于 1.21.5 修改，并继续采用
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a>。
          </p>
          <div class="inactive-modules">
            <strong>一期未启用</strong>
            <span>智能家庭 · 完整日历 · 天气粒子特效</span>
            <small>相关源码仅为后续评估保留，目前没有页面入口，也不会在运行时加载。</small>
          </div>
          <p class="third-party-note">字体：Barlow Condensed · 天气图标：Meteocons · 界面图标：Lucide</p>
        </section>
      </div>

      <footer class="settings-footer">
        <p v-if="saveFeedback" class="save-feedback">{{ saveFeedback }}</p>
        <button class="reset-button" @click="restoreRecommended"><RotateCcw />恢复推荐设置</button>
        <button class="save-button" :disabled="loading || saving" @click="saveSettings">
          <RefreshCw v-if="loading || saving" class="spin" /><Check v-else />保存并刷新
        </button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.settings-overlay{position:fixed;z-index:1000;inset:0;display:flex;justify-content:flex-end;background:rgba(15,15,14,.38);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.settings-panel{display:flex;width:min(47vw,31rem);height:100%;flex-direction:column;border-left:1px solid rgba(17,17,17,.1);background:#f5f3ee;color:#171715;box-shadow:-1.5rem 0 4rem rgba(0,0,0,.16)}
.settings-header{display:flex;align-items:center;justify-content:space-between;padding:1.6rem 1.8rem 1.2rem;border-bottom:1px solid rgba(17,17,17,.1)}
.settings-header p{margin:0 0 .2rem;color:#7b7871;font-size:.72rem;letter-spacing:.14em}.settings-header h2{margin:0;font-size:1.65rem;font-weight:620}
.icon-button{display:grid;width:2.65rem;height:2.65rem;place-items:center;border:0;border-radius:50%;background:rgba(17,17,17,.06);color:inherit}.icon-button svg{width:1.2rem}
.settings-scroll{flex:1;padding:0 1.8rem 1.5rem;overflow-y:auto;-webkit-overflow-scrolling:touch}.settings-section{padding:1.45rem 0 .35rem}.settings-section+.settings-section{border-top:1px solid rgba(17,17,17,.1)}
.test-banner{margin:1rem 0 0;padding:.65rem .8rem;border-radius:.65rem;background:rgba(53,92,125,.1);color:#355c7d;font-size:.72rem;font-weight:650}
.section-heading{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.2rem}.section-heading h3{margin:0;font-size:1.05rem;font-weight:650}.section-heading span{max-width:52%;overflow:hidden;color:#858179;font-size:.7rem;text-align:right;text-overflow:ellipsis;white-space:nowrap}
.field-label{display:block;margin:1rem 0 .55rem;color:#6f6b64;font-size:.76rem;font-weight:550}
.segmented-control{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.35rem;padding:.3rem;border-radius:.8rem;background:rgba(17,17,17,.055)}.segmented-control.two-columns{grid-template-columns:repeat(2,minmax(0,1fr))}
.segmented-control button{min-height:2.5rem;border:0;border-radius:.6rem;background:transparent;color:#6b6862;font-size:.78rem}.segmented-control button.active{background:#fff;color:#111;box-shadow:0 .15rem .7rem rgba(0,0,0,.08);font-weight:650}
.color-row{display:flex;align-items:center;gap:.45rem}.auto-color{width:2.35rem;height:2rem;flex:0 0 2.35rem;padding:0;border:1px solid rgba(17,17,17,.12);border-radius:999px;background:transparent;color:#66625c;font-size:.66rem;white-space:nowrap}.auto-color.selected{border-color:#111;background:#111;color:#fff}
.color-swatch,.custom-color{display:grid;width:2rem;height:2rem;flex:0 0 2rem;place-items:center;border:2px solid #f5f3ee;border-radius:50%;background:var(--swatch);box-shadow:0 0 0 1px rgba(17,17,17,.16);color:#fff}.color-swatch.selected{box-shadow:0 0 0 2px #111}.color-swatch svg{width:.85rem;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}.custom-color{position:relative;border-style:dashed;background:transparent;color:#5e5a54;overflow:hidden}.custom-color input{position:absolute;inset:0;opacity:0}
.toggle-list{margin-top:1.2rem;border-top:1px solid rgba(17,17,17,.08)}.toggle-row{display:flex;width:100%;min-height:3.1rem;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid rgba(17,17,17,.08);background:transparent;color:inherit;font-size:.85rem;text-align:left}
.toggle-row i{position:relative;width:2.25rem;height:1.3rem;border-radius:999px;background:#cbc8c0;transition:.2s}.toggle-row i b{position:absolute;top:.13rem;left:.13rem;width:1.04rem;height:1.04rem;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.18)}.toggle-row i.active{background:#222}.toggle-row i.active b{transform:translateX(.94rem)}
.city-search{position:relative;display:flex;align-items:center;margin-top:.7rem}.city-search>svg{position:absolute;left:.8rem;width:1rem;color:#77736d}.city-search>svg.spin{right:.8rem;left:auto}.city-search input,.text-input{width:100%;box-sizing:border-box;min-height:2.7rem;border:1px solid rgba(17,17,17,.12);border-radius:.7rem;outline:none;background:rgba(255,255,255,.62);color:#171715;font-size:.8rem}.city-search input{padding:0 2.5rem}.text-input{margin-top:.65rem;padding:0 .85rem}
.search-results{position:absolute;z-index:5;top:calc(100% + .35rem);right:0;left:0;overflow:hidden;border:1px solid rgba(17,17,17,.12);border-radius:.7rem;background:#fff;box-shadow:0 .8rem 2rem rgba(0,0,0,.14)}.search-results button{display:flex;width:100%;flex-direction:column;gap:.2rem;padding:.65rem .8rem;border:0;border-bottom:1px solid rgba(17,17,17,.08);background:transparent;color:#171715;text-align:left}.search-results button:last-child{border-bottom:0}.search-results strong{font-size:.8rem}.search-results span{overflow:hidden;color:#7b7770;font-size:.66rem;text-overflow:ellipsis;white-space:nowrap}
.weather-status{display:grid;gap:.55rem;margin-top:1rem;padding:.8rem;border-radius:.7rem;background:rgba(17,17,17,.045)}.weather-status div{display:flex;align-items:center;justify-content:space-between;gap:1rem}.weather-status span{color:#7b7770;font-size:.68rem}.weather-status strong{overflow:hidden;font-size:.7rem;font-weight:600;text-align:right;text-overflow:ellipsis;white-space:nowrap}.weather-status.warning strong{color:#a04b38}
.advanced-settings{margin-top:1.15rem;border-top:1px solid rgba(17,17,17,.09)}.advanced-settings summary{display:flex;align-items:center;justify-content:space-between;padding:1rem 0;color:#6f6b64;cursor:pointer;font-size:.78rem;list-style:none}.advanced-settings summary::-webkit-details-marker{display:none}.advanced-settings summary svg{width:1rem;transition:transform .2s}.advanced-settings[open] summary svg{transform:rotate(180deg)}.advanced-content{padding-bottom:.8rem}.field-note{margin:.65rem 0 0;color:#858179;font-size:.68rem;line-height:1.5}
.about-section p{margin:.15rem 0;color:#6f6b64;font-size:.7rem;line-height:1.65}.about-section a{color:#355c7d;text-decoration:none}.inactive-modules{display:flex;flex-direction:column;gap:.35rem;margin-top:.9rem;padding:.8rem;border-radius:.7rem;background:rgba(17,17,17,.045)}.inactive-modules strong{font-size:.72rem}.inactive-modules span{color:#35332f;font-size:.74rem}.inactive-modules small,.third-party-note{color:#858179;font-size:.66rem;line-height:1.5}
.settings-footer{position:relative;display:flex;gap:.65rem;padding:1rem 1.8rem calc(1rem + env(safe-area-inset-bottom));border-top:1px solid rgba(17,17,17,.1);background:rgba(245,243,238,.96)}.settings-footer button{display:flex;min-height:2.8rem;align-items:center;justify-content:center;gap:.4rem;border-radius:.72rem;font-size:.76rem;font-weight:600}.settings-footer svg{width:1rem}.save-feedback{position:absolute;right:1.8rem;bottom:calc(100% + .45rem);margin:0;padding:.45rem .65rem;border-radius:.55rem;background:#181817;color:#fff;font-size:.68rem;box-shadow:0 .35rem 1rem rgba(0,0,0,.16)}.reset-button{flex:1;border:1px solid rgba(17,17,17,.12);background:transparent;color:#64615b}.save-button{flex:1.25;border:0;background:#181817;color:#fff}.save-button:disabled{opacity:.55}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:700px){.settings-panel{width:min(84vw,31rem)}}
</style>
