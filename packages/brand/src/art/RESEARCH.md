# Pixel art research - round 3 (2026-11-24)

What professional pixel artists do to keep small scenes readable, and what P1-V3, the story scenes, Team v2 and the
Kura scene now follow. Links are the sources read.

## The 10 rules applied

1. **Judge at the real size, early and often.** A sprite is much smaller on screen than in the editor; the final-size
   review is the one that counts. Every scene here was rendered to PNG at its display size (1280, 640, 390, 720x900)
   and looked at before moving on. (PixelJoint readability threads; the claude-pxl skill's build-inspect-patch loop.)
2. **Faces carry the life - pick the smallest readable feature first.** Eyes first, then brows, mouth, a blush. People
   went from ~17 to ~25 pixels tall with a 10-pixel face: 1x2 eyes, a mouth, blush; busts get 2x2 eyes with a
   catchlight on the lit side, brows and a shaded nose.
3. **Separate by value and hue, not detail.** Hair must not match skin, shirt must not match skin; one dominant
   clothing colour per person (school blue, marigold hoodie, teal kurta, white daura and charcoal waistcoat) so each
   silhouette is told apart at a glance.
4. **Outlines close the silhouette; colour them by material.** A pure dark outline is the most readable; coloured
   outlines (skin -> deep brown, shirt -> navy, hoodie -> umber) keep that strength while staying warm. Where two
   materials meet one outline pixel, the darker line wins. Mid-ground buildings get one softer line so they sit back.
5. **Clean lines: perfect slopes only.** 1:2, 1:1, 2:1 lines read as straight; mixed run lengths read as jaggies. All
   ridges now use slopes of 0.5, 1 or 2; the random one-pixel notches and random snowlines are gone; snow drips and
   field lips are a regular repeated pattern. Curves step their runs down in order.
6. **No stray pixels, no doubles, no banding.** Remove orphan pixels and doubled corners; avoid parallel same-length
   runs that make pillow shading. Shading is light from one side (upper right) everywhere, not concentric.
7. **Hue-shift the ramps.** Shadows lean blue-violet, lights lean yellow, but each shadow stays the surface's own
   colour (grass shade is still green). One limited set of ramps serves day and golden hour; golden hour pushes the
   shadows further toward violet and warms every light.
8. **Depth by value.** Far ranges sit close to the sky (pale, cool, low contrast); the mid ground is mid-value; the
   foreground owns the darkest darks and the most saturation. A pale cloth behind the shopkeeper gives her dark hair
   something to read against; the ML engineer stands against a pale wall, not a dark rack.
9. **Anti-alias sparingly and only inside the sprite.** Outer AA looks wrong on another background and reads as noise
   on small sprites. No AA was added; the only dither is one checker row between sky bands.
10. **Text is a UI layer.** Games draw text finer than the world. Bubbles use a drawn pixel font at half the world
    pixel (consistent across every bubble), with a border two half-pixels thick so the frame matches the world's
    one-pixel outline, and a soft offset shadow. Copy sits right above its speaker; where bubbles would collide
    (portrait crop, Kura scene) only one shows at a time, also with motion off.

## Palettes (limited, hue-shifted)

- Resurrect 64 (Kerrie Lake) - 64 colours, built around hue-shifted ramps. No formal licence on Lospec; the author
  answered "Absolutely!" to commercial use in the comments. https://lospec.com/palette-list/resurrect-64
- Endesga 32 - https://lospec.com/palette-list/tag/endesga (no licence text on the page).
- Sweetie 16 - not found with licence terms.
- Decision: no palette was copied. Boli's own ramps live in `valley/palette.ts`, built on the same principles
  (hue-shifted ramps, a small count per material), so there is nothing to license.

## Pixel fonts checked

| Font | Licence | Notes |
|---|---|---|
| Pixelify Sans | OFL 1.1 (fontsource lists it) | https://fontsource.org/fonts/pixelify-sans/about |
| Silkscreen | OFL 1.1 on the Google Fonts mirror; Font Squirrel shows an older Kottke licence - use the Google Fonts release | https://fontsource.org/fonts/silkscreen/about |
| Departure Mono | OFL (font), MIT (site code) | https://departuremono.com/ |
| monogram (datagoblin) | CC0, attribution appreciated | https://datagoblin.itch.io/monogram |
| m5x7 (Daniel Linssen) | not confirmed in this pass | - |

Decision: keep the drawn font in `valley/font.ts` (a 5-row x-height, 7-row caps, m5x7-like proportions). Drawn as
pixels it stays on the scene's grid at every scale; a vector font scaled inside an SVG viewBox would anti-alias off the
grid at non-integer sizes. If the real pages want live, selectable pixel text (a heading, a badge), Pixelify Sans
(OFL) or monogram (CC0) are the safe picks, bundled as local woff2.

## Technique sources

- Selective outlines and coloured outlines: https://lospec.com/articles/pixel-art-outlines-part-2-using-color ,
  https://itch.io/t/2422252/pixel-tutorial-selective-outlines
- Outline basics (diagonal-only connections, equal segments, drop the line where things touch):
  https://lospec.com/articles/pixel-art-outlines
- Anti-aliasing: https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists
- Lines and slopes: https://opengameart.org/content/chapter-2-lines-and-curves ,
  https://community.aseprite.org/t/how-do-i-make-straight-curved-lines-properly/10246
- Hue shifting: https://tinywarriorgames.com/2018/12/21/game-development-pixel-art-hue-shifting ,
  https://pixnote.net/en/learn/shading
- Small characters and readability: https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=23675 ,
  https://nerdbot.com/2026/09/25/character-design-for-small-images/

## Web tooling

- Crisp rendering: `shape-rendering="crispEdges"` on the SVG and `image-rendering: pixelated` for raster/canvas
  (MDN: https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look). Integer coordinates only.
  Our `Grid.paths()` merges same-colour runs into one path per colour, so a scene is a handful of `<path>`s.
- Libraries looked at: pixelarticons (24px icon grid), dazpixel (crispEdges React icons), pixel8 (low-res React
  primitives), react-pixel-art-canvas (an editor, alpha). None replaces the in-house grid; none is added.
- Agent skills for pixel art: wanshuiyin `pixel-art` (rect-per-pixel SVGs), crsolver `claude-pxl`
  (https://github.com/crsolver/claude-pxl - a `.px.js` DSL with a build, inspect the upscaled PNG, patch loop, palette
  ramps with one-character keys, mirror and recolour), tdimino `sprite-forge`. Borrowed: the render-and-look loop,
  one-character palette keys, and recolouring one drawing for day and golden hour instead of redrawing.
