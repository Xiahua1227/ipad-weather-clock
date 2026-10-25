# 一期未启用模块

当前应用入口只加载 `ClockWeatherView` 和新版 `SettingsDrawer`。下列模块源自上游项目，部分源码暂时保留用于后续评估，但不属于 0.1.0 的可用功能。

## 智能家庭／Home Assistant

- 相关文件包括 `src/views/SmartHomeView.vue`、`src/stores/ha.ts`、`src/api/ha-websocket.ts` 和 `src/components/settings/` 中的智能家庭设置组件。
- 当前 `App.vue` 没有加载智能家庭页面。
- 当前设置面板没有 Home Assistant 地址或令牌入口。
- 未对当前 iPadOS 15 目标设备进行连接、安全或兼容性验证。

## 完整日历与黄历页面

- 相关文件包括 `src/views/CalendarView.vue`、`src/components/AlmanacModal.vue` 和日历设置组件。
- 首页仅使用农历日期文本，不加载完整日历页面和黄历弹窗。

## 天气粒子特效

- 相关文件包括 `src/components/WeatherEffects.vue`。
- 当前页面使用彩色 Meteocons 天气图标，不加载雨、雪、雷电等全屏粒子层。

## 维护规则

- 这些模块不得在 README 中作为当前功能宣传。
- 重新启用前应单独完成需求确认、隐私审查、旧版 iPad 性能测试和界面适配。
- 如最终确认不再需要，可在后续版本中删除源码并同步更新本文件、README、NOTICE 和 CHANGELOG。
