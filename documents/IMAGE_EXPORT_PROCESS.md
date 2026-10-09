# Image Export Process

This document describes the reusable DOM-to-image flow used by quote cards and the steps for adding exports to other domains. The current implementation uses `html-to-image` to create square JPEGs for social sharing.

## Current Implementation

- Shared export engine: `src/app/shared/utils/image-export.ts`
- Quote component state and sequencing: `src/app/features/domain-quotes/domain-quote/quote-gallery.component.ts`
- Quote and analysis Ghost markup: `src/app/features/domain-quotes/domain-quote/quote-gallery.component.html`
- Ghost and gallery styles: `src/app/features/domain-quotes/domain-quote/quote-gallery.component.css`
- Dependency: `html-to-image` in `package.json`

The shared `downloadJpeg(element, filename, options)` helper owns rasterization and browser download. Domain components own their Ghost markup and state, then call the helper for each image.

## Ghost Mirror Strategy

Do not capture the visible gallery card. It may acquire transforms, animation, controls, or other layout state that should not appear in an exported image. Instead, create a flat, static Ghost element dedicated to export.

Ghost elements should:

- Have fixed dimensions and all visual styling required by the export.
- Be isolated from interactive and animated gallery markup.
- Be moved far off-screen during normal UI display using absolute positioning and negative offsets.
- Not use `display: none` or `visibility: hidden`; the capture library needs a renderable element.
- Be marked `aria-hidden="true"` and `inert` when they are not user-facing content.

For the quote feature, `#ghostQuoteCard` and `#ghostAnalysisCard` are each 500 by 500 CSS pixels. With `pixelRatio: 2`, the JPEG output is 1000 by 1000 pixels.

### Why the Source Is Temporarily Repositioned

Changing only the cloned node's position is not sufficient. `html-to-image` measures the original node before it applies clone styles. A source located at `left: -9999px` can therefore produce a correctly sized but uniform, blank image.

The shared helper saves the source's original inline `style`, moves it temporarily to the viewport origin with `opacity: 0` and `pointer-events: none`, and asks the library to make the clone opaque and static. A `finally` block restores the exact original inline style, including when capture fails. The live Ghost remains off-screen in the UI before and after export.

## Adding an Export to Another Domain

1. Add `html-to-image` as a runtime dependency if it is not already present. Reuse `downloadJpeg()`; do not create a separate rasterization implementation in the feature.
2. Add dedicated, static Ghost markup to the feature template. Bind it to the selected item and keep it separate from visible or animated cards.
3. Style the Ghost as a fixed-size square with explicit backgrounds, text colors, spacing, and typography. Do not depend on assets or fonts that require cross-origin access unless they are explicitly embedded and tested.
4. Add `@ViewChild` references for the Ghost nodes and a component state value for the item being exported.
5. Before capture, set the selected item and run `ChangeDetectorRef.detectChanges()` so the Ghost contains the current values.
6. Call `downloadJpeg(ghostElement, filename, { backgroundColor })`. Await each call in sequence when one action creates multiple files.
7. Prevent overlapping exports while an export is in progress. In `finally`, clear the selected item, restore UI state, and run change detection.
8. Exclude feature controls from captures of visible cards with the helper's `filter`; the callback must guard for `Element` before using DOM methods such as `matches()`.
9. Handle and surface capture failures through the feature's existing error mechanism.

The quote component exports `quote-[id].jpg` first and exports `analysis-[id].jpg` only when analysis text exists. The Lorem Ipsum quote in its Ghost template is a fallback for empty quote text, not a replacement for saved content.

## Shared Capture Settings

`downloadJpeg()` currently configures:

- `pixelRatio: 2` for a high-resolution square image.
- `quality: 0.95` for JPEG encoding.
- A solid `#1a1a1a` background by default, overridable per export.
- A 500 by 500 CSS-pixel capture size.
- `skipFonts: true` to avoid remote font embedding and its CORS failure modes.
- Explicit computed root text color and matching `-webkit-text-fill-color` in the clone.
- Filtering for export-only UI such as `.download-image-btn` and `.quote-card-header`.

The library's declared filter type says `HTMLElement`, but its runtime traversal can pass text nodes. Keep the `instanceof Element` guard before calling `matches()` or similar methods.

## Verification Checklist

1. Run `npm run build` to check Angular templates, TypeScript, and library options.
2. In a browser, export a real item with short and long text, and verify each expected file downloads.
3. Test both an item with analysis and an item without analysis; the quote image should always export, and the analysis image should be conditional.
4. Decode the JPEG in a browser test and verify its dimensions are 1000 by 1000 and its pixels are not uniform. A valid JPEG MIME type or nonzero file size alone does not prove the image contains visible content.
5. Confirm the Ghost's original inline styles are restored after successful and failed exports, and that the export button does not appear in the image.
6. Check the browser console for CORS errors if fonts, stylesheets, images, or other remote resources are introduced.

The blank-image regression was reproduced in Chromium: capturing the off-screen source generated a uniform JPEG; temporarily repositioning the source before capture generated a 1000 by 1000 JPEG with visible text pixels and restored the source styles afterward.
