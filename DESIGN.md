# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-08-22
- Primary product surfaces: HTML5 canvas game, landscape phone controls, title/menu flow, campaign map, HUD, onboarding, results.
- Evidence reviewed: `PRD.md`, `CLAUDE.md`, `docs/WEB-PORT.md`, `js/input.touch.js`, `js/ui*.js`, `js/render*.js`, `assets/ui/club-crest.png`, browser baselines under `test/goldens/`, and the owner's 2026-08-22 touch-control direction.

## Brand
- Personality: warm 1990s arcade bravado, neighborhood-club sincerity, Russian/Caucasus specificity, chunky hand-made pixel craft.
- Trust signals: the club crest, consistent Cyrillic typography, readable combat tells, stable character identity, responsive controls.
- Avoid: generic mobile-game circles, glossy gradients, modern glass UI, thin text, fake console logos, real police/military branding, or imitating Nintendo trademarks. Hardware references are inspiration for shape and tactility only.

## Product goals
- Goals: make the brawler immediately playable, readable at 1× pixel scale, satisfying on phones, and coherent with its 16-bit world.
- Non-goals: literal hardware emulation, a framework rewrite, portrait gameplay, dense configuration UI, or realism that fights the pixel-art language.
- Success signals: players understand movement and A/B actions without instruction, no touch target misses at 80% scale, no overlapping fighters/HUD, stable 120 Hz simulation, and campaign completion on phone/gamepad/keyboard.

## Personas and jobs
- Primary personas: arcade-action players, club/community supporters, mobile web players, and nostalgic 16-bit players.
- User jobs: start quickly, learn throws in the dojo, read threats, execute precise movement/actions, resume progress, and share a playable link.
- Key contexts of use: iPhone 14-class landscape Safari, Android/Yandex WebView, desktop browser, keyboard, and gamepad.

## Information architecture
- Primary navigation: Title → Mode → Character → Difficulty → Campaign map/Dojo → Play → Pause/Continue/Results.
- Core routes/screens: attract/title, setup menus, map, gameplay HUD, contextual tutorial, pause/settings, continue, results/credits.
- Content hierarchy: combat space first; health/meter and boss hazards second; contextual instruction third; decorative world text last.

## Design principles
- Principle 1: controls belong to the same 1990s object world as the game. Use hard-edged, tactile, code-native pixel shapes.
- Principle 2: state must be legible before it is decorative. Pressed, disabled, ready, benched, invulnerable, and dangerous states need distinct output.
- Tradeoffs: the owner's fixed NES-inspired D-pad/A-B deck supersedes the PRD's floating drift-stick/circular-cluster treatment. Contextual action, gestures, mirroring, target size, and safe-area requirements remain binding.

## Visual language
- Color: charcoal `#111016/#24232A`, warm hardware gray `#B9B3AA`, burgundy action red `#8D2442`, pressed red `#C83B5C`, cream type `#FFF3D5`, hot gold `#F2C14E`; world palettes remain per PRD.
- Typography: `PFont` pixel Cyrillic for all game-facing copy; short uppercase labels; A/B use the same bitmap system.
- Spacing/layout rhythm: 4 px base rhythm in the 480×270 logical UI; align control pieces to integer pixels.
- Shape/radius/elevation: rectangular panels and square D-pad arms; round A/B buttons are the exception. Depth uses one hard offset shadow, never blur or gradient.
- Motion: instant press-state color/face changes; no decorative control animation. Honor reduced motion and flash reduction.
- Imagery/iconography: authored pixel sprites and the club crest. Prefer code-native controller geometry to borrowed console artwork.

## Components
- Existing components to reuse: `PFont`, `PInputTouch`, `PSettings.touch`, `PScreens`, `PUI`, `PMap`, club crest renderer, palette constants already encoded in canvas UI.
- New/changed components: fixed eight-way D-pad; gray action deck; burgundy A/B buttons; small rectangular СМЕНА/СУПЕР controls; benched-hero render exclusion.
- Variants and states: default/pressed; action caption ПРИЁМ/ЗАХВАТ/БРОСОК; SPECIAL hidden until ready; TAG hidden in COOP; right-handed/mirrored; 80–130% scale.
- Token/component ownership: touch geometry and colors live in `js/input.touch.js`; user preference validation lives in `js/settings.js`; simulation intent meanings remain outside rendering.

## Accessibility
- Target standard: WCAG 2.2 A/AA where applicable to canvas UI, plus the PRD's Cyrillic and touch-target gates.
- Keyboard/focus behavior: every touch action retains keyboard/gamepad parity; pause and menu navigation remain operable without touch.
- Contrast/readability: cream-on-charcoal and cream-on-burgundy labels; captions remain readable over the hardware-gray deck.
- Screen-reader semantics: canvas gameplay has limited semantics; platform shell labels and orientation messaging must remain meaningful HTML.
- Reduced motion and sensory considerations: no controller pulsing; vibration respects off/weak/full and reduced-motion preference; flashes and shake use existing preferences.

## Responsive behavior
- Supported breakpoints/devices: 480×270 native world, 960×540 UI, fractional CSS fit below that size, integer scaling above; iPhone 14-class through desktop.
- Layout adaptations: landscape gameplay, safe-area-aware centering, fractional full-height fit on every sub-native high-DPR viewport, portrait rotate screen, mirrored controller swaps left/right groups without changing action meaning.
- Touch/hover differences: touch displays persistent controller hardware after first contact; mouse/keyboard/gamepad do not show it; invisible hit padding exceeds visible geometry.

## Interaction states
- Loading: crest and compact loading state; never expose an inert black canvas.
- Empty: absent generated art uses explicit accepted aliases or code-native fallback.
- Error: fail closed to title/known level and preserve a playable input path.
- Success: pressed controls respond immediately; level/results feedback uses existing ceremony and audio cues.
- Disabled: SPECIAL is absent before full meter; TAG is absent in COOP; unavailable controls never intercept pointer input.
- Offline/slow network, if applicable: static shell and already cached assets remain usable; missing optional platform SDK does not block play.

## Content voice
- Tone: concise, direct, slightly theatrical Russian arcade language.
- Terminology: use ПРИЁМ, ЗАХВАТ, БРОСОК, ПРЫГ, СМЕНА, СУПЕР consistently; use A/B as physical button identifiers, not replacements for action meaning.
- Microcopy rules: uppercase, one short phrase, no tutorial paragraph over combat, preserve Ё/ё and Russian punctuation.

## Implementation constraints
- Framework/styling system: plain JavaScript globals, Canvas 2D, `var`, no framework; lazy cross-module getters.
- Design-token constraints: integer logical coordinates; reuse the documented control palette; no raster console-control asset is required.
- Performance constraints: controller drawing is allocation-light and render-only; input remains deterministic and Pointer Events based.
- Compatibility constraints: iOS Safari, Yandex/Android WebView, desktop browsers; no `roundRect` dependency; safe-area and `visualViewport` behavior remain intact.
- Test/screenshot expectations: `npm test`, campaign bot, focused touch/tag/tutorial tests, and real-browser 120–150 ms pointer/key checks at iPhone 14 landscape; close browser sessions after QA.

## Open questions
- [ ] Owner: decide whether the small auxiliary controls should retain Russian words permanently or become icon-led after a first-run tutorial; impacts localization width only.
- [ ] Creative director: approve final physical-device thumb reach and opacity on an actual iPhone 14; impacts last-mile size/placement tuning.
