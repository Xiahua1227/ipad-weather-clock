# Attribution and third-party notices

This project is a non-commercial derivative of
[`teojs/clock-dashboard`](https://github.com/teojs/clock-dashboard), based on
version 1.21.5 (`7ded058b63e14b85b1afc6e63d8b31481c28ed77`).

The upstream project is licensed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). The
original `LICENSE` file is retained in this repository. This derivative remains
under the same license and is intended for non-commercial use.

## Changes in this derivative

- Reduced the application to a single clock-and-weather home screen.
- Disabled the runtime entry points for Home Assistant, the full-screen
  calendar, and weather particle effects. Some upstream source files remain in
  the repository for future evaluation, but these modules are not loaded by
  the current application.
- Removed bundled Apple SF Compact Rounded font files and their CSS references.
- Replaced the clock face with Barlow Condensed Medium 500.
- Reworked the clock-and-weather layout, settings, theme handling, weather
  status display, data fallback, and iPad safe-area behavior.
- Retained the weather, lunar-calendar, location, PWA, and legacy-iOS
  foundations for further development.

## Fonts and icons

- Barlow Condensed is licensed under the SIL Open Font License 1.1. Its license
  is stored at `public/fonts/BarlowCondensed/OFL.txt`.
- Weather icons are derived from Bas Milius Meteocons and are licensed under the
  MIT License. See <https://github.com/basmilius/weather-icons>.
- Interface icons are provided by Lucide and are licensed under the ISC License.
  See <https://github.com/lucide-icons/lucide>.
