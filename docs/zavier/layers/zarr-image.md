# Zarr image layer

`ZarrImageLayer` is a deck.gl `CompositeLayer` for streaming and rendering large multi-channel 2D images stored as Zarr / OME-Zarr pyramids. It loads tiles on demand as the viewport changes, applies per-channel color and contrast on the GPU, and supports general coordinate transformations.

```ts
import { ZarrImageLayer } from '@bioturing-org/zavier';
```

---

## When to use it

- Rendering OME-Zarr / Zarr NGFF imagery (single or multi-channel).
- Displaying very large images (up to 60k × 60k pixels) with smooth pan/zoom via a multi-resolution pyramid.
- Compositing multiple channels with independent color, contrast, and visibility.
- Aligning an image to a different coordinate frame with an affine / TPS / composed transformation.

For in-memory `TypedArray` data (no Zarr), use `InMemoryPixelSource` with the same layer (see [Pixel sources](#pixel-sources)).

---

## Quick start

```ts
import {
  ZarrImageLayer,
  loadOmeZarr,
  loadOmeZarrMetadata,
  computeView,
  getViewState,
  getChannelCount,
} from '@bioturing-org/zavier';

// 1. Load metadata + build a streaming pixel source
const metadata = await loadOmeZarrMetadata(rootUrl);
const pixelSource = await loadOmeZarr({
  metadata,
  recomputeScale: true,
  options: { overrides: { cache: 'force-cache' } },
});

// 2. Pick which channels to show and their color/contrast
const activeChannels = [
  { id: 0, color: [255, 0, 0], contrast: [0, 255] }, // channel 0 = red
  { id: 1, color: [0, 255, 0], contrast: [0, 1000] }, // channel 1 = green
];

// 3. Create the layer
const imageLayer = new ZarrImageLayer({
  id: 'my-image',
  pixelSource,
  activeChannels,
  enableStencilTest: false,
  discardBlack: false,
});

// 4. Fit the view to the full-resolution image
const [, height, width] = pixelSource.getSpatialDim(0);
const view = computeView([0, 0, width, height], canvasHeight, canvasWidth);
const viewState = getViewState(view);
```

Pass `imageLayer` to your `Deck`/`DeckGL` `layers` array inside an `OrthographicView`.

---

## Props

### `ZarrImageLayerProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pixelSource` | `PixelSource` | — (required) | Source providing tiled pixel data. See [Pixel sources](#pixel-sources). |
| `activeChannels` | `{ id: number; color: Color; contrast: [number, number] }[]` | — | Channels to render. `id` is the channel index, `color` is an RGB triple `[r, g, b]` (0–255), `contrast` is `[min, max]` in pixel-value units. |
| `enableStencilTest` | `boolean` | `false` | When `true`, high-res tiles render first and mark pixels so low-res tiles don't overdraw them. Requires stencil support on the deck instance. |
| `discardBlack` | `boolean` | `false` | When `true`, fully-black output pixels are discarded (useful for alpha compositing of sparse channels). |
| `zoomOffset` | `number` | `0` | Bias pyramid-level selection. `+1` picks a higher-resolution level, `-1` a lower-resolution level. |
| `pointTransform` | `(p: [number, number]) => [number, number]` | — | Forward map applied to tile corner positions on the CPU (used for non-affine transforms). |
| `pointInvTransform` | `(p: [number, number]) => [number, number]` | — | Inverse map used to translate viewport bounds back into tile coordinates for culling. |
| `tileCacheSize` | `number` | `200` | Maximum number of tiles kept in the layer's LRU cache. |
| `retryOptions` | `RetryOptions` | see below | Retry policy for failed tile loads. |
| `requestScheduler` | `LifoStream` | — | Optional shared LIFO scheduler for concurrent tile loads across multiple `ZarrImageLayer` instances. If omitted, an internal scheduler with 6 concurrent requests is created. |
| `modelMatrix` | `Matrix4` | — | deck.gl model matrix (uniform affine transform applied on the GPU). |
| `opacity` | `number` | `1` | Layer opacity (0–1). |
| `visible` | `boolean` | `true` | Layer visibility. |
| `id` | `string` | — (required) | Unique layer id. |

Default `retryOptions`:

```ts
{
  maxRetries: 3,
  delayMs: 1000,
  exponentialBase: 2,
  shouldRetry: (error) => {
    // retries on network errors and 5xx / 408 / 429; never on AbortError
  },
}
```

Standard deck.gl `LayerProps` (`pickable`, `coordinateSystem`, `onHover`, etc.) are also accepted. `ZarrImageLayer` defaults to `COORDINATE_SYSTEM.CARTESIAN`.

---

## How rendering works

1. **Tile selection** — On each viewport change, `getVisibleTiles` computes which pyramid tiles intersect the viewport, accounting for `modelMatrix`, `pointTransform`, and `zoomOffset`.
2. **Cache allocation** — Visible tiles are allocated slots in an LRU `TileCache`. Cached tiles are reused without re-fetching.
3. **Async loading** — Each slot loads its channel data through the `PixelSource` via a LIFO scheduler (most-recently-requested first). Failed loads are retried per `retryOptions`.
4. **Color texture** — Active channel color + contrast are packed into a 2D-array `rgba32float` texture. The shader computes `finalColor = (color / scale) * (pixelValue - contrastMin)`.
5. **Sub-layer rendering** — Each visible tile becomes a `ShaderImageLayer` sub-layer. `filterSubLayer` skips cached-but-not-currently-visible tiles so they stay in memory without rendering.

### Stencil overdraw prevention

With `enableStencilTest: true`, rendering order is reversed (high-res first). Each high-res tile writes `stencilRef=1`; low-res tiles only draw where `stencil==0`, then also write `1`. This prevents lower-resolution tiles from overdrawing sharper ones during transitions. The layer wraps its sub-layers with internal `BeginStencilLayer` / `EndStencilLayer` pseudo-layers so each `ZarrImageLayer` has independent stencil state.

> To use stencil, enable it on the WebGL context when creating your `Deck` instance.

---

## Pixel sources

A `PixelSource` is the abstraction that feeds pixel data into `ZarrImageLayer`. All sources use a single standard dimension order `[t, c, z, y, x]`; missing dimensions are padded with size 1.

### `ZarritaPixelSource` (remote Zarr)

Built from OME-Zarr metadata via the loaders:

```ts
import { loadOmeZarr, loadOmeZarrMetadata } from '@bioturing-org/zavier';

const metadata = await loadOmeZarrMetadata(rootUrl);
const pixelSource = await loadOmeZarr({ metadata, recomputeScale: true });
```

- `loadOmeZarrMetadata(url)` — fetches `zarr.json` / `.zattrs` and standardizes metadata into `StandardizedMetadata`. Tolerates trailing slashes and `?query` fragments.
- `loadOmeZarr({ metadata, recomputeScale, options })` — opens each pyramid level with Zarrita and returns a `ZarritaPixelSource`.
  - `recomputeScale: true` ignores the on-disk scale factors and recomputes them from level dimensions (recommended for correctness).
  - `options.overrides` are passed to the underlying `fetch` (e.g. `{ cache: 'force-cache' }`).
  - `options.useSuffixRequest` uses a suffix byte-range request for the last chunk (some stores need this).

Axis labels are auto-detected from the multiscales metadata (`[{ name: 'x', type: 'space' }, ...]` or legacy `["x","y","z"]`), so any axis order works.

### `InMemoryPixelSource` (local data)

```ts
import { InMemoryPixelSource } from '@bioturing-org/zavier';

const data = new Uint8Array(512 * 512 * 3); // C-contiguous [t, c, z, y, x]
const pixelSource = new InMemoryPixelSource({
  data,
  shape: [1, 3, 1, 512, 512],
  tileSize: [1, 1, 1, 256, 256], // optional, default 256x256
  pixelScale: [1, 1, 1], // optional, world units per pixel [z, y, x]
  maxResolutionLevels: 3, // optional, cap pyramid depth
});
```

It automatically builds a downsampled pyramid (halving each level until 2×2 or `maxResolutionLevels` is reached), so you get the same LOD behavior as a remote source. Good for testing, small images, and preloaded data.

### `CachedPixelSource` / `CachedPixelSourceFactory`

Wraps any `PixelSource` with a shared, memory-aware LRU chunk cache. Useful when rendering many images and you want a global memory budget.

```ts
import { CachedPixelSourceFactory } from '@bioturing-org/zavier';

const factory = new CachedPixelSourceFactory({
  maxCacheSize: 1500, // tiles
  maxMemoryBytes: 2 * 1024 * 1024 * 1024, // 2 GB (default)
});

const cachedSource1 = factory.create(zarrSource1);
const cachedSource2 = factory.create(zarrSource2);
// Both share one cache with isolated keys — no cross-source collisions.
```

Pass the wrapped source to `ZarrImageLayer`'s `pixelSource` prop.

---

## Channels and contrast

### Building `activeChannels`

Each entry is `{ id, color, contrast }`:

- `id` — channel index in the pixel source (`0` to `getChannelCount(pixelSource) - 1`).
- `color` — RGB triple, each component 0–255.
- `contrast` — `[min, max]` pixel-value range mapped to the color. Values below `min` become black; values above `max` saturate.

To compute sensible defaults from the data, use `computeChannelStats`:

```ts
import { computeChannelStats, type ChannelStats } from '@bioturing-org/zavier';

const stats: ChannelStats = await computeChannelStats(pixelSource, channelId, {
  maxConcurrentRequests: 6,
});
// stats.contrastLimits -> [2nd percentile, 98th percentile]
// stats.domain        -> [min, max] of the data type
// stats.histogram     -> Uint32Array of bin counts
```

Use `stats.contrastLimits` as the `contrast` and `stats.domain` as the slider bounds in your UI.

### Toggling channels

`activeChannels` is compared shallowly; recreate the layer with a new array to change visibility, color, or contrast. deck.gl diffing reuses the same GPU resources and only updates the color texture.

```ts
const visible = channels.filter((c) => c.visible).map((c) => ({
  id: c.id,
  color: c.color,
  contrast: c.contrastLimits,
}));

const layer = new ZarrImageLayer({
  id: 'my-image',
  pixelSource,
  activeChannels: visible,
});
```

---

## Transformations

There are three ways to position an image, in increasing generality:

### 1. `modelMatrix` (GPU, affine only)

Pass a `@math.gl/core` `Matrix4` to `modelMatrix`. This is applied on the GPU and is the cheapest option for pan/rotate/scale.

```ts
import { Matrix4 } from '@math.gl/core';

new ZarrImageLayer({
  id: 'image',
  pixelSource,
  activeChannels,
  modelMatrix: new Matrix4().translate([tx, ty, 0]).rotateZ(angle),
});
```

### 2. `pointTransform` / `pointInvTransform` (CPU, any function)

For non-affine warping (e.g. TPS), supply a forward and inverse point map. The forward map positions tile corners; the inverse map translates viewport bounds back to tile space for culling.

```ts
new ZarrImageLayer({
  id: 'image',
  pixelSource,
  activeChannels,
  pointTransform: ([x, y]) => tps.transform([x, y]),
  pointInvTransform: ([x, y]) => tps.inverse?.([x, y]) ?? [x, y],
});
```

### 3. Combine with a `Transformation` object

zavier's `Transformation` classes (`AffineTransformation`, `TPSTransformation`, `CompositeTransformation`) can be converted to the point functions above. See the [Transformations](../overview.md#transformations) section.

---

## Fitting the view

Use `computeView` + `getViewState` to fit the camera to the full-resolution image:

```ts
import { computeView, getViewState } from '@bioturing-org/zavier';

const [, height, width] = pixelSource.getSpatialDim(0);
const view = computeView([0, 0, width, height], canvasHeight, canvasWidth);
const viewState = getViewState(view);
// pass to DeckGL: viewState={{ main: viewState }}
```

`computeView(bounds, canvasHeight, canvasWidth)` returns a `ComputedView` with `target` and `zoom` that centers the given `[minX, minY, maxX, maxY]` bounds in the canvas.

---

## Tuning

### Tile cache

- Default `tileCacheSize` is 200 tiles. Increase it for very large images where users pan across many regions, decrease it to bound memory.
- The cache evicts least-recently-used tiles; evicted tiles are re-fetched on demand.

### Request concurrency

- The internal scheduler allows 6 concurrent tile requests by default.
- To share one scheduler across multiple `ZarrImageLayer` instances (so they don't multiply concurrency), create a `MultiStreamLifoScheduler` and pass a stream to each layer's `requestScheduler`:

```ts
import { MultiStreamLifoScheduler } from '@bioturing-org/zavier';

const scheduler = new MultiStreamLifoScheduler(6);
const stream1 = scheduler.createStream();
const stream2 = scheduler.createStream();

new ZarrImageLayer({ id: 'img-1', pixelSource: src1, activeChannels, requestScheduler: stream1 });
new ZarrImageLayer({ id: 'img-2', pixelSource: src2, activeChannels, requestScheduler: stream2 });
```

### Memory budget for many images

Wrap sources in a shared `CachedPixelSourceFactory` (see above) so decoded chunks share one LRU memory budget instead of each layer caching independently.

---

## Supporting sub-layers

These are exported for advanced composition and are used internally by `ZarrImageLayer` / `DetailWithOverviewLayer`:

| Layer | Description |
|-------|-------------|
| `ShaderImageLayer` | The leaf rasterizer that draws one tile's texture with the channel color texture. You normally don't instantiate this directly. |
| `AxisLayer` | Draws X/Y axis ticks and labels around an image (HUD-style). |
| `ScaleBarLayer` | Draws a snapped scale bar with SI-prefixed units. |
| `DetailWithOverviewLayer` | Composite that renders one or more detail `ZarrImageLayer`s plus a minimap overview showing the current viewport bounding box, axis, and scale bar. |

### `DetailWithOverviewLayer`

Use it when you want a minimap + detail view + scale bar + axes in one composite:

```ts
import { DetailWithOverviewLayer } from '@bioturing-org/zavier';

new DetailWithOverviewLayer({
  id: 'detail-with-overview',
  detailProps: [
    { pixelSource: src1, activeChannels: channels1 },
    { pixelSource: src2, activeChannels: channels2 },
  ],
  overviewProps: {
    maxHeight: 200,
    maxWidth: 200,
    boundingBoxColor: [255, 0, 0],
    boundingBoxOutlineWidth: 2,
    viewportOutlineColor: [255, 255, 255],
    viewportOutlineWidth: 2,
  },
  boundingBox, // [[x,y],[x,y],...] viewport polygon in overview coords
  detailViewState, // { target, zoom, width, height }
  scaleBarProps: { unit: 'µm', size: 10, position: 'bottom-right', snap: true },
});
```

---

## Common pitfalls

- **Blank image** — `activeChannels` is empty, or `contrast` range doesn't contain any pixel values. Use `computeChannelStats` to derive a real `[min, max]`.
- **Tiles never load** — the OME-Zarr URL must be the group root (folder with `zarr.json` / `.zattrs`), not a dataset path. Check CORS headers on the storage.
- **Blurry / wrong resolution** — set `recomputeScale: true` in `loadOmeZarr` so pyramid scales come from dimensions rather than possibly-wrong metadata.
- **Low-res tiles overdraw high-res during zoom** — enable `enableStencilTest: true` (and enable stencil on the deck WebGL context).
- **Too many concurrent requests / rate limited** — share a `MultiStreamLifoScheduler` across layers via `requestScheduler`, or lower its concurrency.
- **Memory growth with many images** — wrap sources in a `CachedPixelSourceFactory` with a `maxMemoryBytes` budget.
- **Non-affine transform looks wrong** — you must provide both `pointTransform` and `pointInvTransform`; the inverse is required for correct tile culling.
