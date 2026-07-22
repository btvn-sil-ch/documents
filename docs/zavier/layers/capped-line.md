# Capped line layer

`CappedLineLayer` renders line segments that end in rectangular caps. Unlike deck.gl's `LineLayer` (which draws plain lines), each segment here is a line with a rectangular block at both endpoints — the classic "measurement bar" or "annotation bracket" glyph used in microscopy and spatial-omics viewers.

```ts
import { CappedLineLayer } from '@bioturing-org/zavier';
```

---

## When to use it

- Drawing measurement / scale annotations between two points.
- Rendering draggable line annotations with visible endpoint handles baked into the line itself.
- Any case where you want a line whose endpoints are emphasized as rectangular caps rather than round dots.

For plain lines or arcs, use deck.gl's `LineLayer` / `ArcLayer`. For lines with circular dots at the ends, combine `LineLayer` with a `ScatterplotLayer`.

---

## Quick start

```ts
import { CappedLineLayer } from '@bioturing-org/zavier';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

type LineDatum = {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
};

const line: LineDatum = {
  sourcePosition: [0, 0, 0],
  targetPosition: [100, 50, 0],
};

const layer = new CappedLineLayer<LineDatum>({
  id: 'measurement',
  data: [line],
  getSourcePosition: (d) => d.sourcePosition,
  getTargetPosition: (d) => d.targetPosition,
  getColor: () => [255, 255, 255, 255], // fill color (line + caps)
  getLineColor: () => [0, 0, 0, 255], // outline color (drawn behind fill)
  lineWidthPixels: 2,
  strokeWidthPixels: 1, // outline thickness around the whole glyph
  endpointWidthPixels: 4, // cap width (perpendicular to line)
  endpointLengthPixels: 12, // cap length (along the line)
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  pickable: true,
});
```

Pass `layer` to your `Deck`/`DeckGL` `layers` array inside an `OrthographicView`.

---

## Props

### `CappedLineLayerProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `LayerDataSource<DataT>` | — (required) | Iterable of line records. |
| `getSourcePosition` | `Accessor<DataT, Position>` | `(d) => d.sourcePosition` | Start point accessor (`[x, y]` or `[x, y, z]`). |
| `getTargetPosition` | `Accessor<DataT, Position>` | `(d) => d.targetPosition` | End point accessor. |
| `getColor` | `Accessor<DataT, Color>` | `[255,255,255,255]` | Fill color of the line and caps (RGBA 0–255). |
| `getLineColor` | `Accessor<DataT, Color>` | `[255,255,255,255]` | Outline color. Only drawn when `strokeWidthPixels > 0`. |
| `lineWidthPixels` | `number` | `2` | Width of the line segment in pixels. |
| `strokeWidthPixels` | `number` | `0` | Outline thickness in pixels, drawn around the whole glyph (line + caps). `0` = no outline. |
| `endpointWidthPixels` | `number` | `4` | Width of each rectangular cap, perpendicular to the line, in pixels. |
| `endpointLengthPixels` | `number` | `12` | Length of each rectangular cap, along the line, in pixels. |

Standard deck.gl `LayerProps` (`id`, `pickable`, `coordinateSystem`, `opacity`, `visible`, `modelMatrix`, `onHover`, `onClick`, …) are also accepted. Use `coordinateSystem: COORDINATE_SYSTEM.CARTESIAN` for non-geospatial data.

---

## How rendering works

Each line is drawn as a single instanced quad mesh with three regions along its length, computed in screen space so the glyph stays a constant pixel size regardless of zoom:

1. **Source cap** — a rectangle of `endpointWidthPixels × endpointLengthPixels` at the start.
2. **Line body** — a rectangle of `lineWidthPixels × lineLengthPixels` connecting the caps.
3. **Target cap** — a rectangle of `endpointWidthPixels × endpointLengthPixels` at the end.

The tangent and normal are computed from the projected source/target positions, so caps always align with the line direction.

### Outline pass

When `strokeWidthPixels > 0`, the layer first draws the whole glyph enlarged by `strokeWidthPixels * 2` using `getLineColor` (with `useLineColor = 1`), then draws the normal-size glyph on top using `getColor`. This produces a clean outline around the line and both caps in a single layer.

---

## Picking & interaction

`CappedLineLayer` is fully pickable. Set `pickable: true` and use deck.gl's `onHover` / `onClick` / `onDragStart` / `onDrag` / `onDragEnd`. `PickingInfo.index` is the index of the line in the `data` array.

A common pattern (used in the zavier dev app) is to combine a `CappedLineLayer` with a `ShapeMarkerLayer` for draggable endpoint handles — see the [Shape marker layer](shape-marker.md) doc for handle examples. The line itself can be made draggable by snapshotting source/target on drag start and applying the pointer delta to both endpoints.

---

## Example: draggable measurement line

```tsx
import { useCallback, useRef, useState } from 'react';
import { CappedLineLayer } from '@bioturing-org/zavier';
import { COORDINATE_SYSTEM, type PickingInfo } from '@deck.gl/core';

type LineDatum = {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
};

export function useDraggableLine(initial: LineDatum) {
  const [line, setLine] = useState(initial);
  const dragOrigin = useRef<[number, number, number] | null>(null);
  const snapshot = useRef<LineDatum | null>(null);

  const onDragStart = useCallback((info: PickingInfo) => {
    if (!info.coordinate) return;
    dragOrigin.current = [info.coordinate[0], info.coordinate[1], 0];
    snapshot.current = { ...line };
  }, [line]);

  const onDrag = useCallback((info: PickingInfo) => {
    if (!info.coordinate || !dragOrigin.current || !snapshot.current) return;
    const dx = info.coordinate[0] - dragOrigin.current[0];
    const dy = info.coordinate[1] - dragOrigin.current[1];
    setLine({
      sourcePosition: [
        snapshot.current.sourcePosition[0] + dx,
        snapshot.current.sourcePosition[1] + dy,
        0,
      ],
      targetPosition: [
        snapshot.current.targetPosition[0] + dx,
        snapshot.current.targetPosition[1] + dy,
        0,
      ],
    });
  }, []);

  const onDragEnd = useCallback(() => {
    dragOrigin.current = null;
    snapshot.current = null;
  }, []);

  const layer = new CappedLineLayer<LineDatum>({
    id: 'draggable-line',
    data: [line],
    getSourcePosition: (d) => d.sourcePosition,
    getTargetPosition: (d) => d.targetPosition,
    getColor: () => [255, 255, 255, 255],
    getLineColor: () => [0, 0, 0, 255],
    lineWidthPixels: 2,
    strokeWidthPixels: 1,
    endpointWidthPixels: 4,
    endpointLengthPixels: 12,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    pickable: true,
  });

  return { line, layer, onDragStart, onDrag, onDragEnd };
}
```

To let the user resize the line by dragging the caps, add a `ShapeMarkerLayer` of two square handles at the endpoints and branch on `info.index` (0 = source, 1 = target) in `onDrag`.

---

## Performance notes

- All sizing is in **pixels**, so glyphs are constant size on screen regardless of zoom. This is intentional for annotations.
- The layer uses one instanced model for all lines; recreate the layer (or update `data`) to change geometry. For many static lines, pass the full array once.
- The outline is a second draw pass of the same model with enlarged uniforms — no extra geometry is allocated.
- `getBounds()` is implemented over `instanceSourcePositions` / `instanceTargetPositions`, so deck.gl view fitting works.

---

## Common pitfalls

- **Caps not visible** — `endpointWidthPixels` / `endpointLengthPixels` default to 4 and 12 px. If you set them to 0, only the line body draws.
- **No outline** — `strokeWidthPixels` defaults to `0`. Set it ≥ 1 and provide a distinct `getLineColor` to see the outline.
- **Line disappears when very short** — the line body length is computed in pixels; if the source and target project to the same screen point, the body has near-zero length. The caps still draw, so the glyph remains visible.
- **Caps rotated wrong** — caps always align to the projected source→target direction. If your coordinates are in a non-Cartesian system, pass `coordinateSystem` accordingly.
- **Pixel sizes change with zoom** — they don't; all widths are screen-space pixels by design. If you need world-space widths, use deck.gl's `LineLayer` with `widthUnits: 'meters'` instead.
