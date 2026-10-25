<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import { i18n } from './i18n'
import { useConfigStore } from './stores/config'
import { isIpadIOS15OrLower } from './utils/device'
import ClockWeatherView from './views/ClockWeatherView.vue'

const configStore = useConfigStore()
const { language } = storeToRefs(configStore)

i18n.global.locale.value = language.value
watch(language, (nextLocale) => {
  i18n.global.locale.value = nextLocale
})
</script>

<template>
  <main class="viewport-container relative h-screen w-screen overflow-hidden bg-black">
    <template v-if="!isIpadIOS15OrLower()">
      <div class="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-900/10 blur-3xl" />
      <div class="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-900/10 blur-3xl" />
    </template>

    <ClockWeatherView />
    <SettingsDrawer />
  </main>
</template>
