# React hooks

The `@bioturing-org/zavier/react` subpath provides three hooks plus a KDBush-backed spatial-index manager. They are designed to work together for viewport-aware rendering of large point clouds.

```ts
import {
  useViewportBounds,
  useLODThreshold,
  useSpatialIndexManager,
  SpatialIndex,
  SpatialIndexManager,
} from '@bioturing-org/zavier/react';
```

> React is an **optional** peer dependency. The core library works without React; you only need `react`/`react-dom` installed if you import from this subpath.

---

## When to use the hooks

- You render a `ScatterplotShapeLayer` with millions of points and want GPU LOD sampling to keep a constant on-screen density as the user pans/zooms.
- You need to query which points are inside the current viewport (for CPU-side filtering, brushing, or selection).
- You want to share a cached spatial index across multiple components without rebuilding the KD-tree on every view switch.

For static images and small datasets you don't need these hooks — just construct the layers directly.

---

## `useViewportBounds`

Computes the world-space bounding box of the current orthographic viewport, with optional padding so points slightly outside the view are preloaded (avoids popping during pan).

```ts
const bounds = useViewportBounds({
  viewState, // OrthographicViewState | null
  width,     // canvas width in CSS pixels
  height,    // canvas height in CSS pixels
  padding,   // optional, default 0.1 (10%)
});
// bounds: [minX, minY, maxX, maxY] | null
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `viewState` | `OrthographicViewState \| null` | — | Current deck.gl orthographic view state. Returns `null` while unset. |
| `width` | `number` | — | Canvas width in CSS pixels. |
| `height` | `number` | — | Canvas height in CSS pixels. |
| `padding` | `number` | `0.1` | Fraction of the viewport extent to add as padding on each side. `0.1` = 10%. |

### Returns

`ViewportBounds` (`[minX, minY, maxX, maxY]`) or `null`.

The hook builds a transient `OrthographicView` from the view state, unprojects the canvas corners to world coordinates, and expands the result by `padding`. The result is memoized on `[viewState, width, height, padding]`.

### Example

```tsx
import { useViewportBounds } from '@bioturing-org/zavier/react';

function Viewer({ viewState, width, height }) {
  const viewportBounds = useViewportBounds({ viewState, width, height });

  // Use bounds to query a spatial index or filter data
  useEffect(() => {
    if (!viewportBounds) return;
    const [minX, minY, maxX, maxY] = viewportBounds;
    // ...fetch / filter points in this box
  }, [viewportBounds]);

  return <DeckGL ... />;
}
```

---

## `useSpatialIndexManager`

Accesses the shared `SpatialIndexManager` from React context. The manager caches KDBush spatial indexes by string ID, so an index built in one component is available everywhere in the same tree without rebuilding.

```ts
const manager = useSpatialIndexManager();
// manager: SpatialIndexManager
```

### Providing a custom manager

By default a fresh `new SpatialIndexManager()` is used. To inject a custom subclass (e.g. with logging or metrics), wrap your tree with `SpatialIndexContext.Provider`:

```tsx
import { SpatialIndexContext } from '@bioturing-org/zavier/react';
import { useMemo } from 'react';

const customManager = useMemo(() => new MyExtendedSpatialIndexManager(), []);

<SpatialIndexContext.Provider value={customManager}>
  <Viewer />
</SpatialIndexContext.Provider>
```

All hooks in the subtree (`useLODThreshold`, etc.) resolve the manager through this context automatically.

### `SpatialIndexManager`

| Method | Description |
|--------|-------------|
| `getOrCreate(id, pages)` | Get the cached `SpatialIndex` for `id`, or build one from `pages` and cache it. `pages` is ignored if an index already exists for `id`. |
| `has(id)` | `true` if an index exists for `id`. |
| `get(id)` | The cached `SpatialIndex` or `null`. |
| `remove(id)` | Dispose and remove the index for `id`. Returns `true` if removed. |
| `disposeAll()` | Dispose every cached index and clear the cache. |

### `SpatialIndex`

| Method | Description |
|--------|-------------|
| `queryRange(minX, minY, maxX, maxY)` | Returns KDBush-local indices of all points in the box. |
| `queryRangeWithCoords(minX, minY, maxX, maxY)` | Same, but returns `{ index, x, y }` per hit. |
| `localToOriginalIndex(localIdx)` | Map a KDBush-local index back to the original point index (the `page.start + j` value). |
| `localToPageInfo(localIdx)` | Map to `{ pageIdx, withinPage }`. |
| `groupIndicesByPage(localIndices)` | Group local indices by page → `Map<pageIdx, withinPage[]>`. |
| `getLocalToOriginalMap()` | O(1) lookup table `Int32Array` (built lazily, cached). |
| `getPositions()` | The flat `Float32Array` of `[x, y, ...]` used to build the index. |
| `pointCount` | Total number of indexed points. |
| `dispose()` | Free the index memory. |

`pages` is an array of `{ src: Float32Array; start: number; length: number }` where `src` is an interleaved `[x, y, ...]` buffer, `start` is the global index of the first point in the page, and `length` is the number of points in the page. This page-aware design lets you map query results back to original cell/gene indices across paginated data.

### Example: build, query, clean up

```tsx
import { useSpatialIndexManager } from '@bioturing-org/zavier/react';

function useCellSpatialIndex(cellCenterId: string, pages) {
  const manager = useSpatialIndexManager();

  useEffect(() => {
    if (cellCenterId && pages?.length) {
      manager.getOrCreate(cellCenterId, pages);
    }
    return () => {
      // Optional: remove on unmount, or keep cached for reuse
      // manager.remove(cellCenterId);
    };
  }, [manager, cellCenterId, pages]);

  return manager;
}
```

---

## `useLODThreshold`

Computes a density-aware LOD threshold (0–1) for `ScatterplotShapeLayer`'s GPU random sampling. When the viewport is sparse, it returns `1.0` (render everything). When dense, it returns a fraction so only a representative subset passes the vertex-shader hash test, keeping the frame rate up.

```ts
const lodThreshold = useLODThreshold({
  pointCount,    // total points in the layer (fallback when no spatial index)
  width,         // deck.gl canvas width
  height,        // deck.gl canvas height
  enabled,       // optional, default true
  id,            // optional spatial-source id for querying the cached index
  viewportBounds,// optional [minX, minY, maxX, maxY] for the spatial query
  decayPower,    // optional, curve aggressiveness
});
// lodThreshold: number (0.0–1.0)
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pointCount` | `number` | — (required) | Total points in the layer. Used as the visible count when no spatial index is available. |
| `width` | `number` | — (required) | deck.gl canvas width (CSS pixels). Multiplied by `devicePixelRatio` internally. |
| `height` | `number` | — (required) | deck.gl canvas height (CSS pixels). |
| `enabled` | `boolean` | `true` | When `false`, always returns `1.0` (render all). |
| `id` | `string` | — | Spatial-source id. When provided with `viewportBounds`, the hook queries `manager.get(id)` for the actual visible point count. |
| `viewportBounds` | `ViewportBounds \| null` | — | `[minX, minY, maxX, maxY]` for the spatial query (typically from `useViewportBounds`). |
| `decayPower` | `number` | `1.5` | Curve aggressiveness. `1` = linear ratio; higher = more aggressive reduction for large datasets. |

### How the threshold is computed

Internally it calls `computeLODThreshold({ visiblePoints, pixelCount, decayPower })`:

1. If `visiblePoints` is below a soft limit → `1.0` (render all).
2. `density = visiblePoints / pixelCount`. If `density < 1` → `1.0` (sparse enough).
3. `maxPoints = min(pixelCount * pointsPerPixel, absoluteMaxPoints)` — the absolute cap protects weak GPUs on large/high-DPI displays.
4. `threshold = (maxPoints / visiblePoints) ^ decayPower`, clamped to `[0.01, 1.0]`.

Defaults: `pointsPerPixel = 1`, `decayPower = 1.5`, `absoluteMaxPoints = 5_000_000`.

### Two modes

- **With spatial index** (`id` + `viewportBounds` provided): queries the cached KDBush index for the actual visible point count → accurate threshold that adapts to pan/zoom.
- **Without spatial index**: falls back to `pointCount` (total) → still functional but doesn't adapt to the viewport.

### Example: full pipeline

```tsx
import {
  useViewportBounds,
  useLODThreshold,
  useSpatialIndexManager,
} from '@bioturing-org/zavier/react';
import { ScatterplotShapeLayer, ScatterShape } from '@bioturing-org/zavier';

function ScatterView({ viewState, width, height, positions, radii, fillColors, cellCenterId, pages }) {
  // 1. Build / reuse the spatial index for this dataset
  const manager = useSpatialIndexManager();
  useEffect(() => {
    if (cellCenterId && pages?.length) manager.getOrCreate(cellCenterId, pages);
  }, [manager, cellCenterId, pages]);

  // 2. Compute the viewport bounds (with 10% padding)
  const viewportBounds = useViewportBounds({ viewState, width, height });

  // 3. Compute a density-aware LOD threshold
  const lodThreshold = useLODThreshold({
    pointCount: radii.length,
    width,
    height,
    id: cellCenterId,
    viewportBounds,
  });

  // 4. Pass the threshold to the scatter layer
  const layer = new ScatterplotShapeLayer({
    id: 'cells',
    positions,
    radii,
    fillColors,
    colorFormat: 'RGBA',
    shapeType: ScatterShape.CIRCLE,
    radiusUnits: 'pixels',
    lodThreshold,
    lodSeed: 0, // keep stable across frames
  });

  return <DeckGL layers={[layer]} ... />;
}
```

The threshold feeds into `ScatterplotShapeLayer`'s `lodThreshold` prop; points with `hashRandom(instanceID, seed) > lodThreshold` are discarded in the vertex shader. Keep `lodSeed` stable across frames for a given dataset to avoid flicker.

---

## Putting it all together

A typical high-performance viewer wires the three hooks in this order:

1. `useSpatialIndexManager` — get the shared manager.
2. `manager.getOrCreate(id, pages)` — build the KD-tree once per dataset (in a `useEffect`).
3. `useViewportBounds({ viewState, width, height })` — track the current viewport in world space.
4. `useLODThreshold({ pointCount, width, height, id, viewportBounds })` — get a density-aware threshold.
5. Pass `lodThreshold` to `ScatterplotShapeLayer`.

This keeps on-screen point density roughly constant regardless of zoom, while the spatial index lets you answer "which points are visible" in O(log n + k) for brushing/selection.

---

## Common pitfalls

- **Threshold always 1.0** — either `enabled` is `false`, `pointCount` is below the soft limit, or the viewport is sparse (`density < 1`). That's correct behavior — LOD only kicks in when actually dense.
- **Threshold not adapting to viewport** — you passed `pointCount` but no `id`/`viewportBounds`, so it uses the total count. Provide both to enable spatial-index queries.
- **`manager.get(id)` returns null** — the index hasn't been built yet. Call `manager.getOrCreate(id, pages)` before reading it (e.g. in a `useEffect` on mount / when `pages` arrive).
- **Stale index after data changes** — `getOrCreate` ignores `pages` if an index already exists for `id`. Call `manager.remove(id)` first, then `getOrCreate` with the new pages.
- **Memory growth** — call `manager.remove(id)` when a dataset is no longer needed, or `manager.disposeAll()` on teardown. Each `SpatialIndex` holds a `Float32Array` of positions and a KDBush tree.
- **High-DPI over-reduction** — `pixelCount` includes `devicePixelRatio²`, so on retina displays the threshold is more lenient (more points). If you want stricter culling, raise `decayPower` or lower `pointsPerPixel` (the latter requires calling `computeLODThreshold` directly).
