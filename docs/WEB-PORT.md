# Web and Yandex Games port

## Decision

THE PATRIOT is already an HTML5 game. Its production stack is deliberately small:

- static HTML and CSS;
- plain JavaScript globals, with a deterministic 120 Hz simulation;
- Canvas 2D for the 480×270 world and 960×540 UI buffers;
- Web Audio with OGG/M4A assets;
- JSON data baked into a script fallback for archive/WebView use.

Yandex Games does not mandate Unity, Phaser, React, or another engine. Its public
contract is a browser game archive with `index.html` at the ZIP root, the Yandex
Games SDK, correct mobile presentation, gesture controls, lifecycle handling and
platform-compliant saves/ads. Rewriting this game into another engine would add
download size and regression risk without solving controls, falls, or Safari
lifecycle behavior.

Official references:

- [Yandex Games technical requirements](https://yandex.com/dev/games/doc/en/concepts/requirements)
- [SDK connection and initialization](https://yandex.com/dev/games/doc/en/sdk/sdk-about)
- [Loading and gameplay events](https://yandex.com/dev/games/doc/en/sdk/sdk-game-events)
- [Pause/resume events](https://yandex.com/dev/games/doc/en/sdk/sdk-events)
- [Draft/archive upload](https://yandex.com/dev/games/doc/en/console/add-new-game/draft)
- [Correct mobile display](https://yandex.com/dev/games/doc/en/requirements/1/10)

## Runtime contract

`js/platform.js` is the only platform seam. On Yandex-hosted pages it loads
`/sdk.js`, initializes `YaGames`, calls `LoadingAPI.ready()` after game assets are
interactive, brackets PLAY with `GameplayAPI.start()` / `stop()`, and maps Yandex
pause/resume into the existing pause screen and audio suspension. Other hosts do
not request the SDK and keep working as standalone HTML.

For the Yandex draft:

1. Build a ZIP whose root contains `index.html`, `css/`, `js/`, `data/` and
   `assets/`; do not add a containing directory.
2. Declare mobile + desktop support and landscape orientation in the draft.
3. Keep advertising calls at authored pauses only. No ad call belongs in sim code.
4. Use the Yandex archive wrapper for local persistence. If the game is later
   self-hosted, route saves through `ysdk.getStorage()` or player data instead of
   assuming unrestricted iOS localStorage.
5. Verify the draft itself on an iPhone before release; localhost emulation is not
   evidence that the portal wrapper, ads, storage or audio unlock work.

## iPhone 14 contract

- Viewport uses `device-width`, `viewport-fit=cover`, and `visualViewport`.
- Portrait is blocked by a branded rotate screen; gameplay is landscape-first.
- The portrait overlay uses safe-area insets; gameplay controls keep a 24 CSS px
  viewport edge inset and use the natural letterbox rails whenever they fit.
- Touch uses semantic contextual glyphs, separated 44 px primary targets, Pointer
  Events, and `touch-action:none`; controller letters and opaque hardware slabs are
  deliberately excluded.
- Backgrounding, page hide and host pause suspend audio and enter PAUSE.
- The canvas fractionally fills every sub-960×540 CSS viewport regardless of
  device-pixel ratio, while allocating a sharp DPR-aware backing buffer. Large
  screens may retain integer scaling; the complete 16:9 playfield is never clipped.
- iPhone Safari itself keeps browser chrome around ordinary tabs. The published
  web-app manifest and club touch icon make Share → Add to Home Screen launch the
  game in landscape fullscreen mode without Safari's URL or tab bars.
- On the first Enter/Space/pointer gesture, `PPlatform` requests Yandex
  `screen.fullscreen`, otherwise the standard browser Fullscreen API. iPhone
  WebKit makes a bounded toolbar-collapse attempt because it does not expose
  element fullscreen on iPhone; the viewport control rails keep the ordinary-tab
  layout intentional even when Safari retains its chrome. A Railway page embedded from
  Yandex loads the required absolute hosted SDK URL; uploaded archives use `/sdk.js`.
- Runtime HTML/JavaScript/data/manifests use revalidation caching because their
  filenames are not content-hashed; heavy image/audio assets retain a short public
  cache. Version the boot URL when shipping a viewport-critical hotfix.

Useful platform guidance:

- [Apple: configuring the viewport](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html)
- [Apple HIG: game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- [Apple WWDC26: Make your game great with touch](https://developer.apple.com/videos/play/wwdc2026/358/)
- [MDN: `touch-action` and pointer cancellation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
- [WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Xbox accessibility guideline: input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)

## Test pyramid

Game tests should verify contracts at the cheapest layer that can observe them:

1. Pure deterministic tests: movement, combat, checkpoints, lives, pooling,
   malformed input and full-world hashes. These are fast and seed-replayable.
2. Gameplay scenario tests: authored pits, below-world recovery, every campaign
   segment, bosses, Continue and GO gates. Use legal input bots where possible;
   direct state setup is reserved for reaching a specific invariant.
3. Real-browser tests: natural 120–150 ms key holds, script load order, canvas
   hashes, all presentation screens, console/page errors and lifecycle events.
4. Reference-device tests: iPhone 14 landscape/portrait, touch reachability, notch
   and home-indicator clearance, background/resume audio, storage, thermal/load
   performance, and the actual Yandex draft wrapper.

This follows the same separation used by established game/browser testing
guidance: fast non-runtime checks versus runtime/player checks, isolated E2E tests,
and assertions against player-visible behavior.

- [Unity Test Framework: Edit mode vs Play mode](https://docs.unity3d.com/Packages/com.unity.test-framework%402.0/manual/edit-mode-vs-play-mode-tests.html)
- [Playwright test best practices](https://playwright.dev/docs/best-practices)

## Release commands

```sh
npm test
npm run botfight
npm run qa:browser
npm run qa:perf
npm run audio:qa
```

The first three are mandatory for every gameplay/web change. `qa:perf` still needs
comparison with a real iPhone/Yandex draft because desktop emulation cannot prove
mobile GPU, memory, thermal or Web Audio behavior.

## Railway test deployment

Railway builds the root `Dockerfile`, whose context is restricted by
`.dockerignore` to the runtime HTML, CSS, JavaScript, data and assets. The container
runs as the unprivileged `node` user, binds to Railway's injected `PORT` on
`0.0.0.0`, and is promoted only after `GET /health` succeeds. `server.js` applies
the same runtime allowlist, so repository files cannot be fetched from the public
domain even if they accidentally enter a future image.
