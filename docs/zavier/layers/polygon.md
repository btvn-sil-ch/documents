# Polygon layer

`PolygonLayer` renders filled polygons and/or their boundaries in a single deck.gl layer. It is designed for segmentation masks (cell / tissue boundaries) where you have many polygon rings and want to fill, stroke, or both — while sharing one vertex buffer between the fill and boundary models to keep memory low.

```ts
import { PolygonLayer } from '@bioturing-org/zavier';
```

---

## When to use it

- Rendering segmentation masks (cell, nucleus, tissue outlines).
- Filling and/or stroking many polygon rings with a shared color.
- Applying a coordinate transformation (affine / TPS / composed) to polygon vertices on the CPU.
- Viewport culling to skip polygons entirely outside the view.

For per-polygon colors or deck.gl's richer styling (e.g. elevation, extrusion), use deck.gl's built-in `SolidPolygonLayer` / `PolygonLayer` instead. zavier's `PolygonLayer` optimizes for the segmentation use case: shared fill + boundary geometry, culling, and transformation.

---

## Quick start

```ts
import { PolygonLayer } from '@bioturing-org/zavier';

// Each polygon is a Float32Array of interleaved [x1, y1, x2, y2, ...] ring coordinates.
const polygons: Float32Array[] = [
  new Float32Array([0, 0, 10, 0, 10, 10, 0, 10]),
  new Float32Array([20, 20, 30, 20, 30, 30, 20, 30]),
];

const layer = new PolygonLayer({
  id: 'segmentation',
  data: polygons,
  getColor: [255, 0, 0], // fill + stroke color (RGB)
  viewMode: 'both', // 'filled' | 'stroked' | 'both'
  strokeWidth: 1, // stroke width in pixels (used when stroked/both)
  culling: true, // skip rendering polygons outside the viewport
  pickable: true,
});
```

Pass `layer` to your `Deck`/`DeckGL` `layers` array inside an `OrthographicView`.

---

## Props

### `PolygonLayerProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Float32Array[]` | — (required) | Array of polygon rings. Each ring is an interleaved `Float32Array` of `[x, y, x, y, ...]`. |
| `getColor` | `Accessor<Float32Array, Color>` | `[255, 0, 0]` | Color accessor used for both fill and stroke. A `Color` is an RGB or RGBA tuple (0–255). |
| `viewMode` | `'filled' \| 'stroked' \| 'both'` | `'filled'` | What to draw. `filled` = fill only, `stroked` = boundary only, `both` = fill + boundary. |
| `strokeWidth` | `number` | `1` | Boundary stroke width in pixels. Only used when `viewMode` is `'stroked'` or `'both'`. |
| `transformation` | `Transformation` | — | CPU transform applied to every vertex before upload. See [Transformations](#transformations). |
| `culling` | `boolean` | `true` | When `true`, the whole layer is skipped if its bounds don't intersect the viewport. |
| `onLayerInfoChange` | `(id, info \| null) => void` | — | Callback reporting the layer's bounding box and point count. Called on data/transformation/visibility changes and on destruction (with `null`). |
| `pickable` | `boolean` | `false` | Enable picking. When `true`, each vertex gets a picking color encoding its polygon index. |
| `modelMatrix` | `Matrix4` | — | deck.gl model matrix (GPU affine). Bounds used for culling are transformed by this matrix. |
| `opacity` | `number` | `1` | Layer opacity (0–1). |
| `visible` | `boolean` | `true` | Layer visibility. |
| `id` | `string` | — (required) | Unique layer id. |

Standard deck.gl `LayerProps` are also accepted. Use `coordinateSystem: COORDINATE_SYSTEM.CARTESIAN` for non-geospatial data.

---

## How rendering works

`PolygonLayer` builds two GPU models that share the same vertex position buffer:

1. **Fill model** — Tessellates each ring into triangles with `earcut` and draws them with `triangle-list` topology. Indexed drawing uses the triangle index count, not the unique-vertex count.
2. **Boundary model** — Draws the ring outlines as thick lines using an instanced `triangle-strip` quad per segment. A per-vertex `instanceVertexValid` attribute marks the last vertex of each ring invalid, so the GPU culls the unwanted segment that would otherwise connect the end of one ring to the start of the next.

This shared-buffer design keeps memory at 2 floats per vertex (x, y) for both fill and boundary — no duplicated geometry.

### Culling

When `culling` is `true`, the layer computes its overall bounds during tessellation and, on each viewport change, checks whether the (model-matrix-transformed) bounds intersect the viewport. If not, the entire `draw()` is skipped. This is a coarse layer-level cull; per-polygon culling is not performed.

---

## Transformations

Pass a `Transformation` to map polygon vertices on the CPU before upload. This is how you align a segmentation mask to an image or another coordinate frame.

```ts
import { PolygonLayer, AffineTransformation } from '@bioturing-org/zavier';
import { Matrix4 } from '@math.gl/core';

const transformation = new AffineTransformation(
  new Matrix4().translate([tx, ty, 0]).rotateZ(angle),
);

const layer = new PolygonLayer({
  id: 'aligned-segmentation',
  data: polygons,
  getColor: [0, 255, 0],
  viewMode: 'both',
  strokeWidth: 1,
  transformation,
  culling: true,
});
```

`TPSTransformation` and `CompositeTransformation` work the same way. When `transformation` or `data` changes, the geometry is rebuilt and the attribute manager is invalidated.

---

## Tracking layer info

Use `onLayerInfoChange` to report bounds and counts to a parent component (e.g. to fit the view or compute density settings):

```ts
const layer = new PolygonLayer({
  id: 'segmentation',
  data: polygons,
  getColor: [255, 0, 0],
  onLayerInfoChange: (id, info) => {
    if (info) {
      const [minX, minY, maxX, maxY] = info.boundingBox;
      // fit view, store bounds, etc.
    } else {
      // layer was destroyed or became invisible
    }
  },
});
```

The callback receives `info = { boundingBox: [minX, minY, maxX, maxY], pointCount: 0 }` (pointCount is `0` for polygon layers since they have no points) or `null` when the layer is cleared, becomes invisible, or is destroyed.

---

## Picking

Set `pickable: true` to enable picking. Each vertex receives a picking color encoding its polygon index, so `PickingInfo.index` in `onClick` / `onHover` is the index of the clicked polygon in the `data` array.

```ts
const layer = new PolygonLayer({
  id: 'segmentation',
  data: polygons,
  getColor: [255, 0, 0],
  pickable: true,
  onClick: ({ index }) => {
    if (index >= 0) console.log('clicked polygon', index);
  },
});
```

---

## Performance notes

- **Single-pass tessellation** — vertices are transformed, copied, bounds-tracked, and ring boundaries marked in one loop, with pre-allocated `Float64Array` / `Uint8Array` buffers.
- **Shared buffers** — fill and boundary models reuse the same positions attribute; memory is ~2 floats per vertex.
- **Culling** — keep `culling: true` (the default) for large masks; it avoids all GPU work when the mask is off-screen.
- **Rebuild triggers** — geometry is rebuilt only when `data` or `transformation` changes. Changing `getColor`, `viewMode`, or `strokeWidth` does not rebuild geometry.
- **Large datasets** — for hundreds of thousands of polygons, prefer `Float32Array` rings (not nested JS arrays) and avoid recreating the `data` array reference each render unless the data actually changed.

---

## Common pitfalls

- **Boundary draws a line across the screen** — this happens if the ring's last vertex isn't flagged invalid. zavier handles this automatically via `instanceVertexValid`; if you fork the layer, preserve that attribute.
- **Polygons look clipped at the edge of the viewport** — `culling` is layer-level, not per-polygon. Polygons partially in view still render fully; only fully-off-screen layers are skipped.
- **Stroke too thin / thick** — `strokeWidth` is in pixels and only applies when `viewMode` is `'stroked'` or `'both'`. With `'filled'` it is ignored.
- **Transform not applied** — `transformation` is CPU-side and rebuilds geometry. If you only need pan/rotate/scale, `modelMatrix` is cheaper (GPU) but doesn't update the CPU bounds used for culling unless the layer recomputes them.
- **Holes not supported** — each entry in `data` is a single outer ring. For polygons with holes, split them into separate rings or extend the layer; `earcut` supports holes via a second argument but this layer passes `undefined`.
