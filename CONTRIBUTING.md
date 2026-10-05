# Contributing

Thanks for your interest in SkyTrack! Small fixes and new ideas are both welcome.

## Quick start

```bash
git clone https://github.com/SametDuhan/airock.git
cd airock
npm install
npm start      # run the app
npm test       # run the tests
```

Demo mode works without internet, so you can try UI changes without hitting the free data sources' rate limits.

## Where things are

- `src/data.js`: all network requests (flights, routes, aircraft info)
- `src/geo.js`: distance and great-circle helpers (unit-tested in `test/`)
- `src/renderer.js`: map, flight card, list, filters, replay
- `src/index.html`: layout and styles

## Good places to start

Look for issues labeled [`good first issue`](https://github.com/SametDuhan/airock/labels/good%20first%20issue).
If you want to work on one, comment on it first so we don't duplicate work.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep the change small and focused.
3. Run `npm test` and make sure it passes. Add a test if you touch `src/geo.js` or `src/data.js`.
4. Open a PR and describe what you changed and why. A screenshot helps for UI changes.

Turkish or English are both fine in issues and PRs.
