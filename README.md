# iPad Weather Clock｜iPad 天气时钟

面向旧款 iPad 横屏常驻展示的极简天气时钟。当前版本以 iPad mini 4（iPadOS 15）为主要测试设备，提供时间、日期、农历、实时天气、空气质量、湿度、体感温度与降雨概率，并支持浅色、深色和自动主题。

> 本项目是 [`teojs/clock-dashboard`](https://github.com/teojs/clock-dashboard) 的非商业衍生版本，基于上游 1.21.5（`7ded058b63e14b85b1afc6e63d8b31481c28ed77`）修改。它不是原项目的官方版本。

## 在线使用

- GitHub Pages：<https://xiahua1227.github.io/ipad-weather-clock/>
- GitHub 仓库：<https://github.com/Xiahua1227/ipad-weather-clock>

在 iPad Safari 中打开 Pages 地址后，可通过“分享 → 添加到主屏幕”作为横屏常驻页面使用。在线版本不需要 Mac 保持开机。

## 当前功能

- 适配 4:3 横屏 iPad 的单页时钟与天气布局。
- Barlow Condensed 时钟字体和可选时钟颜色。
- 公历日期、星期与农历日期。
- Open-Meteo 天气、US AQI、湿度、体感温度与降雨概率。
- 自动定位、手动城市和北京默认回退。
- 可选和风天气数据源；使用者需自行提供 API Key 与 API Host。
- 白天浅色、夜间纯黑以及手动主题设置。
- 天气数据超时、重试和最近一次成功数据缓存。
- PWA 添加到主屏幕和 iPadOS 15 旧版浏览器兼容构建。

## 一期未启用的保留模块

以下模块的部分上游源码仍保留在仓库中，方便后续评估，但当前应用没有入口，也不会在运行时加载：

- 智能家庭／Home Assistant
- 完整日历与黄历页面
- 全屏天气粒子特效

具体文件和边界见 [`docs/INACTIVE_MODULES.md`](docs/INACTIVE_MODULES.md)。“保留源码”不代表相关功能已通过当前版本验证。

## 天气数据与隐私

- 默认天气源为 [Open-Meteo](https://open-meteo.com/)，无需 API Key。
- 自动定位由浏览器在用户授权后提供；也可以在设置中选择手动城市。
- 设置、天气缓存及可选的和风天气凭据保存在当前浏览器的本地存储中，不应写入源代码。
- 公开部署前不要提交 `.env`、API Key、访问令牌、个人地址或浏览器数据。
- Open-Meteo 显示的是 US AQI；如需中国常用 AQI 口径，可自行配置和风天气。

## 本地运行

环境要求：Node.js 22、pnpm 9.6。

```bash
pnpm install
pnpm dev
```

生产构建和本地预览：

```bash
pnpm build
pnpm preview --host 0.0.0.0
```

局域网预览要求运行服务器的电脑与 iPad 位于同一网络，且电脑在访问期间保持开机。正式部署到 GitHub Pages 后不再需要电脑常开。

## GitHub Pages

仓库包含 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)。GitHub Pages 已设置为使用 GitHub Actions；每次推送 `main` 分支都会自动构建和发布 `dist/`。

本项目已使用相对构建基址，并对字体、图标和 PWA 资源做了子目录兼容处理。

## 项目来源与许可

本衍生版本继续采用 [CC BY-NC-SA 4.0](LICENSE)：

- 必须保留对原作者和原项目的署名。
- 必须说明对原作品进行了修改。
- 仅允许非商业用途。
- 再分发衍生版本时需继续采用相同许可。

完整归属和修改说明见 [`NOTICE.md`](NOTICE.md)，第三方字体与图标许可见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

## 主要修改

- 将多页面仪表盘重构为单一横屏天气时钟。
- 为 iPad mini 4 重新设计信息比例、排版和安全区域。
- 用 Barlow Condensed 替换不适合再分发的 Apple 字体文件。
- 重做天气图标、环境指标与白天／夜间视觉。
- 重做设置面板并保留时钟颜色、位置和天气数据源设置。
- 增加天气失败回退、缓存状态和隐藏测试模式。
- 停用智能家庭、完整日历和天气粒子特效入口。

## 上游项目

- 原作者：[`teojs`](https://github.com/teojs)
- 原仓库：[`teojs/clock-dashboard`](https://github.com/teojs/clock-dashboard)
- 基准版本：1.21.5 / `7ded058b63e14b85b1afc6e63d8b31481c28ed77`

感谢原作者及所有上游依赖项目的贡献者。
