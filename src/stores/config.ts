import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeLocale } from '../i18n'

const defaultLanguage = normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : undefined)

export const useConfigStore = defineStore('config', () => {
  const showDrawer = ref(false)
  const activeTab = ref<'general' | 'clock' | 'weather'>('general')
  const language = ref(defaultLanguage)

  const clockConfig = ref({
    /** 时钟颜色 */
    color: '#ffffff',
    /** 字重 */
    fontWeight: 700,
    /** 数字随机倾斜 */
    enableTilt: true,
    /** 显示秒钟 */
    showSeconds: false,
    /** 透明度 */
    opacity: 0.9,
    /** 24小时制 */
    is24Hour: true,
    /** 数字水平间距（em，负值表示重叠） */
    digitSpacing: -0.18,
  })

  const layoutConfig = ref({
    /** 仅显示时钟 */
    clockOnlyMode: false,
    /** 紧凑模式：时钟在左，日历与天气在右 */
    compactMode: false,
    /** 显示农历 */
    showLunar: true,
    /** 显示节假日 */
    showFestival: true,
  })

  const dashboardConfig = ref({
    /** 昼夜主题跟随天气、固定浅色或固定深色 */
    themeMode: 'auto' as 'auto' | 'day' | 'night',
    /** auto 表示跟随主题文字颜色 */
    clockColor: 'auto',
    showLunar: true,
    showTip: true,
    showPrecipitation: true,
  })

  return {
    clockConfig,
    dashboardConfig,
    layoutConfig,
    showDrawer,
    activeTab,
    language,
  }
}, {
  persist: {
    omit: ['showDrawer', 'activeTab'],
  },
})
