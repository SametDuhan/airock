# SkyTrack

**English** · [Türkçe](README.tr.md)

[![tests](https://github.com/SametDuhan/airock/actions/workflows/test.yml/badge.svg)](https://github.com/SametDuhan/airock/actions/workflows/test.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

SkyTrack is a free desktop app for tracking flights live on a map, similar to Flightradar24. It runs on Windows, macOS and Linux, and it uses open ADS-B data, so you don't need an account or an API key.

![SkyTrack showing live flights around Istanbul, with a selected flight's route and details](docs/screenshot.jpg)

## Features

- **Live flights**: aircraft positions refresh every 15 seconds. When you move or zoom the map, the new area loads right away.
- **Demo mode**: 45 simulated flights that need no internet connection. Time runs 30× faster.
- **Flight details**: click a plane to see:
  - its airline and logo, aircraft type, registration and a photo (when one is available)
  - its route (departure → arrival), progress bar, distance left and estimated time left
  - its altitude, speed and vertical speed
- **Route and trail**: the route is drawn as a great-circle arc, the actual shortest path over the globe. The trail shows where the plane has flown over the last ~30 minutes.
- **Filters**:
  - an altitude range on one slider (left handle = minimum, right handle = maximum)
  - a minimum speed
  - departure and/or arrival airport, by code (IST, LTFM) or city name
  - aircraft on the ground on or off, and a favorites-only option
- **Favorites**: star a flight (☆) to find it again later.
- **Alert zone** (*Alert zone*): click the map to set a circle (100 km by default; change the radius in the menu, 10–500 km). You get a notification when an aircraft enters it, including one that first appears inside it.
- **Replay**: rewind the last hour with the slider at the bottom, then press *● Live* to return to live.
- **Map styles**: Standard, Light or Dark.
- **Fast with many planes**: all aircraft are drawn on a single canvas. Around 3,700 aircraft over Europe draw in about 8 ms.

## Download

Get the installer for your system from the [latest release](https://github.com/SametDuhan/airock/releases/latest) (`.exe` for Windows, `.dmg` for macOS, AppImage for Linux). No account needed. To run from source instead, see below.

## Getting started

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/SametDuhan/airock.git
cd airock
npm install
npm start
```

To build an installer for your operating system (`.exe`, `.dmg` or AppImage), run:

```bash
npm run dist
```

The installer is created in the `dist/` folder.

The repository is named `airock`; the app itself is SkyTrack. Your filters and alert zone are remembered between sessions. Run the tests with `npm test`.

## How to use

| I want to… | Do this |
|---|---|
| See real flights | In the left menu, click **Live**. **Demo** switches back to simulated flights. |
| Get details about a plane | Click the plane on the map or in the list. Close the card with **✕**. |
| Find a flight | Type a callsign (e.g. `THY1`) or registration (e.g. `TC-JPN`) into the search box. |
| Show only flights from Istanbul to Frankfurt | Under *Filters*, type `IST` into **Departure** and `FRA` into **Arrival**. Fill in only one box to see all departures or all arrivals for that airport. |
| Hide or show the side menu | Click **✕** at the top of the menu. Click **☰** on the map to bring it back. |
| Go back in time | Drag the slider at the bottom of the map. |

## Data sources

| Data | Source | Notes |
|---|---|---|
| Aircraft positions, zoomed in | [adsb.lol](https://adsb.lol) | Free, no key. Strict rate limit (~10 requests/min). |
| Aircraft positions, wide view or backup | [OpenSky Network](https://opensky-network.org) | Covers a large area in one request. Has a low daily limit for anonymous users. |
| Route, aircraft type, registration, photo | [adsbdb.com](https://www.adsbdb.com) | Free, no key. Some flights may be missing or out of date. |
| Airline logos | images.kiwi.com | |
| Maps | OpenStreetMap, Esri | |

All network requests are in [`src/data.js`](src/data.js).

> Flightradar24's own data is a paid commercial API. SkyTrack uses only open, community-collected ADS-B data, so coverage can be thinner in some regions.

## Troubleshooting

- **The status shows an error, or few planes appear when zoomed out.**
  The free sources limit how many requests you can make. When OpenSky's daily limit runs out, SkyTrack shows only the center of the map and asks you to zoom in. Zooming in usually fixes it.
- **Live mode doesn't work when I open `src/index.html` in a browser.**
  The data sources only allow requests from the desktop app, not from a web page (they block cross-origin requests from browsers). Use `npm start`. Demo mode works in both.
- **A flight shows "Route info not found".**
  The route database doesn't know this callsign. The rest of the details still work.

## Project structure

```
main.js           Electron window; passes data requests from the app to src/data.js
preload.js        Exposes those requests to the app safely
src/index.html    Layout and styles
src/loader.js     Loads Leaflet (local copy first, CDN as a fallback), then the app
src/geo.js        Distance, bearing and great-circle helpers (unit-tested)
src/data.js       All data sources: flights, routes, aircraft info
src/renderer.js   Map, aircraft layer, flight card, list, filters, replay
docs/             Screenshots used in this README
```

Built with [Electron](https://www.electronjs.org) and [Leaflet](https://leafletjs.com).

## Contributing

Bug reports, ideas and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [`good first issue`](https://github.com/SametDuhan/airock/labels/good%20first%20issue) list. If SkyTrack is useful to you, a ⭐ helps other people find it.

Released under the [MIT License](LICENSE).
