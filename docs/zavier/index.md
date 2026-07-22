# Overview

`@bioturing-org/zavier` is a TypeScript-first library of custom **deck.gl** layers, pixel sources, and React hooks for high-performance 2D spatial-omics and microscopy visualization. It extends deck.gl with rendering primitives tuned for large multi-channel Zarr images, segmentation polygons, scatter plots of millions of cells, and interactive annotation overlays.

---

## Why zavier?

Standard deck.gl layers are general-purpose and work well for geospatial data, but spatial-omics has different demands:

- **Very large images** (up to 60k × 60k pixels) stored as multi-resolution Zarr pyramids.
- **Multi-channel rendering** with per-channel color, contrast, and gamma applied on the GPU.
- **Millions of scatter points** (cells / molecules) that need density-aware level-of-detail (LOD) sampling.
- **Segmentation polygons** with shared fill + boundary geometry and viewport culling.
- **General transformations** (affine, thin-plate-spline, composed) for image and point alignment.

zavier provides these as drop-in deck.gl layers so you can compose them inside any deck.gl `Deck` or `DeckGL` instance.

---

## Two import paths

The package exposes two subpath imports:

```ts
// Core (vanilla TS) — works in any deck.gl app, React not required
import { ZarrImageLayer, ScatterplotShapeLayer } from '@bioturing-org/zavier';

// React integration — hooks + spatial-index manager
import { useViewportBounds, useLODThreshold } from '@bioturing-org/zavier/react';
```

The root path re-exports everything from both core and react, so `import { ... } from '@bioturing-org/zavier'` is also valid.

---

## What you can render

### Layers

| Layer | Class | Use it for |
|-------|-------|------------|
| [Zarr image](layers/zarr-image.md) | `ZarrImageLayer` | Streaming multi-channel OME-Zarr / Zarr NGFF images with tiled LOD pyramid loading |
| [Polygon](layers/polygon.md) | `PolygonLayer` | Segmentation polygon fill + boundary with culling and transformations |
| [ScatterplotShape](layers/scatter-plot-shape.md) | `ScatterplotShapeLayer` | High-throughput circle/square scatter with density-based max radius and GPU LOD sampling |
| [Capped line](layers/capped-line.md) | `CappedLineLayer` | Lines with rectangular capped endpoints (annotation / measurement) |
| [Shape marker](layers/shape-marker.md) | `ShapeMarkerLayer` | Rotatable, billboarded circle/square markers (handles, anchors) |

Supporting zarr-image sub-layers are also exported: `ShaderImageLayer`, `AxisLayer`, `ScaleBarLayer`, and `DetailWithOverviewLayer` (a composite that renders a detail view plus a minimap overview with a viewport bounding box).

Each layer is a standard deck.gl `Layer` and is constructed with `new LayerName({ ...props })` and added to the `layers` array of your `Deck`/`DeckGL` instance.

### Pixel sources

A `PixelSource` is the abstraction zavier uses to feed pixel data into `ZarrImageLayer`:

| Source | Description |
|--------|-------------|
| `ZarritaPixelSource` | Reads OME-Zarr / Zarr NGFF pyramids via Zarrita with flexible axis ordering |
| `InMemoryPixelSource` | Wraps an in-memory `TypedArray` and auto-builds a downsampled pyramid |
| `CachedPixelSource` / `CachedPixelSourceFactory` | LRU memory cache wrapping any `PixelSource` |
| `ChannelManager` | Packs active-channel color + contrast into a GPU texture |

Loaders:

- `loadOmeZarrMetadata(url)` — fetch and standardize OME-Zarr metadata.
- `loadOmeZarr({ metadata, recomputeScale, options })` — build a `ZarritaPixelSource` from metadata.

All pixel data flows through a single standard dimension order `[t, c, z, y, x]`, so layers never need to care about the on-disk axis layout. Missing dimensions are padded with size 1.

### Transformations

zavier ships a small transformation framework implementing the `Transformation` interface:

| Class | Description |
|-------|-------------|
| `IdentityTransformation` | No-op transform |
| `AffineTransformation` | Linear affine (matrix + translation) from a `@math.gl/core` `Matrix4` |
| `TPSTransformation` | Thin-plate-spline non-rigid transform |
| `CompositeTransformation` | Chain multiple transforms |
| `reconstructAlignmentTransformation(...)` | Rebuild a transform from serialized alignment params |

Layers accept a `transformation?: Transformation` prop and apply it to positions/bounds on the CPU before upload. This is how image↔point alignment is expressed.

---

## Utilities

These helpers are reusable independently of the layers:

- **Color** — `hexToRGB`, `rgbToHex`, `interpolateColor`, `getColorFromRange`, `createColorScale`, `DEFAULT_COLOR_RANGES`, `adjustBrightness`, `getLuminance`, `getContrastingTextColor`.
- **Geometry** — `distance2D/3D`, `getBoundingBox2D/3D`, `getBoundingBoxCenter2D`, `generateCirclePoints`, `resolveAccessor`.
- **Math** — `clamp`, `lerp`, `mapRange`, `normalize`, `smoothstep`, `easing`, `degreesToRadians`, `radiansToDegrees`.
- **Layer helpers** — `applyTransformationToPoint`, `applyTransformationToPositions`, `computeBoundsFromPositions`, `transformBoundsWithMatrix`, `injectBoundsCallback`.
- **DeckGL view helpers** — `computeView`, `getViewState`, `makeBoundingBox`, `computeBoundingBox`, `combineBoundingBox`, `calculateOverviewPosition`.
- **Shaders** — `shaderUtils`, `shaderModule` (reusable GLSL).
- **Errors** — `ZavierError`, `CacheError`, `LayerError`, `PixelSourceError`, `wrapError`.
- **Scheduler** — `MultiStreamLifoScheduler`, `LifoStream`, `withRetry` (used for tile loading concurrency control).
- **Pixel chunk** — `isContiguous`, `makeContiguous`, `extractChannelSlice`, `extractChannelSlices`.
- **Scalebar** — `sizeToMeters`, `snapValue`, `TARGETS`, `SI_PREFIXES`.
- **Tileset** — `getVisibleTiles`, `getVisibleTilesAtLevel`.

---

## React integration

The React entry point is optional and adds three hooks plus a spatial-index manager. See [React hooks](react-hooks.md) for full details.

| Export | Kind | Description |
|--------|------|-------------|
| `useViewportBounds` | hook | World-space bounding box of the current orthographic viewport (with padding) |
| `useLODThreshold` | hook | Density-aware LOD threshold (0–1) for `ScatterplotShapeLayer` GPU sampling |
| `useSpatialIndexManager` | hook + context | Access a shared `SpatialIndexManager` via React context |
| `SpatialIndex` | class | KDBush-backed 2D spatial index with page-aware index mapping |
| `SpatialIndexManager` | class | Cache of `SpatialIndex` instances keyed by string ID |

React is a **peer dependency marked optional** — the core library works without React, and you only need `react`/`react-dom` installed if you use the `@bioturing-org/zavier/react` subpath.

---

## Peer dependencies

zavier builds on top of deck.gl and luma.gl:

```bash
npm install @deck.gl/core@9.1.15 @deck.gl/layers@9.1.15 \
            @luma.gl/core@9.1.10 @luma.gl/engine@9.1.10 \
            @luma.gl/shadertools@9.1.10 @luma.gl/webgl@9.1.10 \
            kdbush@>=4.0.2
```

Add `react` and `react-dom` (≥18) only if you use the React hooks.

---

## Where to go next

- [Getting started](getting-started.md) — install, set up a `DeckGL` canvas, and render your first image + scatter.
- [Zarr image layer](layers/zarr-image.md) — streaming OME-Zarr imagery.
- [Polygon layer](layers/polygon.md) — segmentation polygons.
- [ScatterplotShape layer](layers/scatter-plot-shape.md) — high-throughput scatter.
- [Capped line layer](layers/capped-line.md) — capped annotation lines.
- [Shape marker layer](layers/shape-marker.md) — rotatable markers.
- [React hooks](react-hooks.md) — viewport bounds, LOD, and spatial indexing.
