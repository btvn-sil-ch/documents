# ScatterplotShape layer

`ScatterplotShapeLayer` renders a large number of points as circles or squares. It is tuned for spatial-omics scatter plots (cells, molecules) where you may have millions of points and need density-aware sizing and GPU level-of-detail (LOD) sampling to keep the frame rate up.

```ts
import { ScatterplotShapeLayer, ScatterShape } from '@bioturing-org/zavier';
```

---

## When to use it

- Plotting hundreds of thousands to millions of cells / molecules.
- You want density-based maximum radius so dense regions don't fully overdraw.
- You want GPU-side random sampling (LOD) so high-density regions render a representative subset instead of every point.
- You need circle or square glyphs with optional stroke and fill.

For small datasets or per-point accessors in the deck.gl style, this layer also supports accessor props (`getPosition`, `getFillColor`, …), but the typed-array props below are the high-throughput path.

---

## Quick start

```ts
import {
  ScatterplotShapeLayer,
  ScatterShape,
} from '@bioturing-org/zavier';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

const N = 3;
const positions = new Float32Array([0, 0, 50, 0, 25, 40]); // [x1,y1, x2,y2, ...]
const radii = new Float32Array([10, 10, 10]);
const fillColors = new Uint8Array([
  255, 0, 0, 255,
  0, 255, 0, 255,
  0, 0, 255, 255,
]); // interleaved RGBA
const lineColors = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
const lineWidths = new Float32Array([1, 1, 1]);

const layer = new ScatterplotShapeLayer({
  id: 'cells',
  positions,
  radii,
  fillColors,
  lineColors,
  lineWidths,
  colorFormat: 'RGBA',
  shapeType: ScatterShape.CIRCLE,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  radiusUnits: 'pixels',
  stroked: true,
  filled: true,
  pickable: true,
});
```

Pass `layer` to your `Deck`/`DeckGL` `layers` array inside an `OrthographicView`.

---

## Props

### High-throughput data props

These accept pre-interleaved typed arrays — one entry per point, packed contiguously. This avoids per-point JS object allocation and is the recommended path for large datasets.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `positions` | `Float32Array` | `[]` | Interleaved `[x1, y1, x2, y2, ...]`. |
| `radii` | `Float32Array` | `[]` | One radius per point. |
| `fillColors` | `Uint8Array` | `[]` | Interleaved RGB or RGBA (see `colorFormat`). |
| `lineColors` | `Uint8Array` | `[]` | Interleaved RGB or RGBA stroke colors. |
| `lineWidths` | `Float32Array` | `[]` | One stroke width per point. |
| `colorFormat` | `'RGB' \| 'RGBA'` | `'RGB'` | Channel layout of `fillColors` / `lineColors`. Set to `'RGBA'` when your arrays include alpha. |

### Accessor props (small datasets)

When you don't pass the typed-array props, the layer falls back to deck.gl-style accessors over `data`:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `LayerDataSource<DataT>` | — | Iterable of objects. |
| `getPosition` | `Accessor<DataT, Position>` | `(d) => d.position` | Center position accessor. |
| `getRadius` | `Accessor<DataT, number>` | `1` | Radius accessor. |
| `getFillColor` | `Accessor<DataT, Color>` | `[0,0,0,255]` | Fill color accessor. |
| `getLineColor` | `Accessor<DataT, Color>` | `[0,0,0,255]` | Stroke color accessor. |
| `getLineWidth` | `Accessor<DataT, number>` | `1` | Stroke width accessor. |

### Styling & sizing

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `shapeType` | `ScatterShape` | `ScatterShape.CIRCLE` | Glyph shape: `CIRCLE` (0) or `SQUARE` (1). |
| `radiusUnits` | `'meters' \| 'common' \| 'pixels'` | `'meters'` | Unit of `radii` / `getRadius`. Use `'pixels'` for screen-space sizes that don't shrink on zoom-out. |
| `radiusScale` | `number` | `1` | Radius multiplier. |
| `radiusMinPixels` | `number` | `0` | Minimum radius in pixels (prevents points vanishing when zoomed out). |
| `radiusMaxPixels` | `number` | `MAX_SAFE_INTEGER` | Maximum radius in pixels (prevents points covering the screen when zoomed in). |
| `maxRadius` | `number` | `0` | Max radius in world units (0 = no limit). Only applies when `radiusUnits` is `'common'` or `'meters'`. The layer also computes a density-based max radius automatically — see [Density-based sizing](#density-based-sizing). |
| `lineWidthUnits` | `'meters' \| 'common' \| 'pixels'` | `'meters'` | Unit of stroke widths. |
| `lineWidthScale` | `number` | `1` | Stroke width multiplier. |
| `lineWidthMinPixels` | `number` | `0` | Minimum stroke width in pixels. |
| `lineWidthMaxPixels` | `number` | `MAX_SAFE_INTEGER` | Maximum stroke width in pixels. |
| `stroked` | `boolean` | `false` | Draw outlines. |
| `filled` | `boolean` | `true` | Draw fills. |
| `billboard` | `boolean` | `false` | If `true`, glyphs always face the camera; if `false`, they lie on the ground plane. |
| `antialiasing` | `boolean` | `true` | Smooth glyph edges. |

### LOD (level of detail)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lodThreshold` | `number` (0–1) | `1.0` | Fraction of points to render. `1.0` = all points; `0.5` ≈ half. Points with `hashRandom(instanceID, seed) > lodThreshold` are discarded in the vertex shader. |
| `lodSeed` | `number` | `0` | Seed for the hash function. Change it to get a different sampling pattern. |

For viewport-aware LOD, compute `lodThreshold` with the [`useLODThreshold`](../react-hooks.md#uselodthreshold) hook.

### Transform & info

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `transformation` | `Transformation` | — | CPU transform applied to positions before upload. See [Transformations](#transformations). |
| `onLayerInfoChange` | `(id, info \| null) => void` | — | Reports `{ boundingBox, pointCount }` on data/transform/visibility changes and `null` on destruction. |
| `index` | `number` | `0` | Layer index (for multi-layer bookkeeping). |
| `modelMatrix` | `Matrix4` | — | deck.gl model matrix (GPU). Bounds reported via `getLayerBounds()` are transformed by it. |

Standard deck.gl `LayerProps` (`pickable`, `coordinateSystem`, `opacity`, `visible`, `id`, …) are also accepted.

---

## `ScatterShape` enum

```ts
enum ScatterShape {
  CIRCLE = 0,
  SQUARE = 1,
}
```

TypeScript's reverse mapping works: `ScatterShape[0]` returns `"CIRCLE"`. Pass the numeric value to `shapeType`.

---

## Density-based sizing

When points are dense, full-size circles overlap and overdraw, wasting GPU fill rate. `ScatterplotShapeLayer` computes a density-based maximum radius automatically from the layer bounds and point count, using [`computeDensityBasedMaxRadius`](#computedensitybasedmaxradius):

```
areaPerPoint = (boundsWidth * boundsHeight) / pointCount
maxRadius    = sqrt(areaPerPoint) * 0.5
```

This `maxRadius` (in world units) is applied in the shader on top of your `radiusScale` / `radiusMaxPixels` settings. It only constrains when `radiusUnits` is `'common'` or `'meters'`; pixel-unit radii are not clamped (they aren't comparable to world units).

You can also compute it yourself:

```ts
import { computeDensityBasedMaxRadius } from '@bioturing-org/zavier';

const { maxRadius, areaPerPoint } = computeDensityBasedMaxRadius(
  pointCount,
  viewportWidth,
  viewportHeight,
);
```

---

## LOD sampling

When `lodThreshold < 1`, the vertex shader runs a hash on each instance ID and discards points whose hash exceeds the threshold. This is a GPU-side random subsample that keeps visual density roughly constant regardless of zoom.

- `lodThreshold = 1.0` → render every point (default).
- `lodThreshold = 0.5` → render ~50% of points.
- `lodSeed` changes the hash pattern; keep it stable across frames to avoid flicker, or animate it for a "shimmer" effect.

For accurate, viewport-aware thresholds, pair this with the [`useLODThreshold`](../react-hooks.md#uselodthreshold) React hook, which uses a KDBush spatial index to count visible points and picks a threshold that targets a constant on-screen density.

---

## Transformations

Pass a `Transformation` to map positions on the CPU before upload. The layer recomputes bounds and the density-based max radius whenever `positions`, `transformation`, or `modelMatrix` changes.

```ts
import { ScatterplotShapeLayer, ScatterShape, AffineTransformation } from '@bioturing-org/zavier';
import { Matrix4 } from '@math.gl/core';

const transformation = new AffineTransformation(
  new Matrix4().rotateZ((30 * Math.PI) / 180).translate([tx, ty, 0]),
);

const layer = new ScatterplotShapeLayer({
  id: 'aligned-cells',
  positions,
  radii,
  fillColors,
  colorFormat: 'RGBA',
  shapeType: ScatterShape.CIRCLE,
  transformation,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  radiusUnits: 'pixels',
});
```

`TPSTransformation` and `CompositeTransformation` are supported the same way.

---

## Tracking layer info

`onLayerInfoChange` reports the layer's bounding box and point count, useful for fitting the view or computing density settings. It fires:

- when `positions`, `transformation`, or `modelMatrix` changes while visible,
- when the layer becomes invisible (with `null`),
- when the layer is destroyed (with `null`).

```ts
const layer = new ScatterplotShapeLayer({
  id: 'cells',
  positions, radii, fillColors, colorFormat: 'RGBA',
  onLayerInfoChange: (id, info) => {
    if (info) {
      const [minX, minY, maxX, maxY] = info.boundingBox;
      // info.pointCount === radii.length
    }
  },
});
```

You can also call `layer.getLayerBounds()` directly to get `[minX, minY, maxX, maxY]` (or `null` if empty), with `modelMatrix` applied.

---

## Performance notes

- **Prefer typed-array props** (`positions`, `radii`, `fillColors`, …) over accessors for large datasets. They upload directly without per-point JS work.
- **Stable references** — when mutating data in place, keep the same `Float32Array` / `Uint8Array` reference. The layer diffs by reference; a new array triggers re-upload.
- **`radiusUnits: 'pixels'`** gives screen-space sizes that don't shrink when zoomed out (good for always-visible dots). Use `'meters'` / `'common'` when size should track the data scale.
- **Enable LOD** for very dense layers. A threshold around `0.3–0.7` often keeps frame rate high with little visible difference.
- **`radiusMinPixels`** prevents points from disappearing when zoomed out; set it to ~1–2 px.
- **Picking** works with both data modes; `PickingInfo.index` is the point index.

---

## Common pitfalls

- **Points invisible at low zoom** — set `radiusMinPixels` ≥ 1, or use `radiusUnits: 'pixels'`.
- **Points too big and covering everything at high zoom** — set `radiusMaxPixels`, or rely on the automatic density-based `maxRadius` (world units).
- **Colors look wrong** — `colorFormat` must match your color arrays. RGB arrays with `colorFormat: 'RGBA'` (or vice versa) will misalign channels.
- **LOD flicker** — keep `lodSeed` stable across frames for a given dataset. Only change it intentionally.
- **Transformed points in wrong place** — `transformation` is CPU-side and rebuilds the positions attribute. If you only need pan/rotate/scale, `modelMatrix` is cheaper but does not recompute the CPU bounds used for density sizing.
- **`maxRadius` prop ignored** — it only applies with `radiusUnits` of `'common'` or `'meters'`. With `'pixels'`, use `radiusMaxPixels` instead.
