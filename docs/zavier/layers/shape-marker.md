# Shape marker layer

`ShapeMarkerLayer` renders individual markers (circle or square) at given positions, each with its own size, rotation angle, fill color, outline color, and outline width. Unlike `ScatterplotShapeLayer` (which is optimized for millions of uniform points), `ShapeMarkerLayer` is for a small number of individually styled, rotatable, billboarded markers — typically interactive handles, anchors, or annotations.

```ts
import { ShapeMarkerLayer, SHAPE_MARKER } from '@bioturing-org/zavier';
```

---

## When to use it

- Draggable handles / anchors at the endpoints of a `CappedLineLayer`.
- A small set of individually rotated square/circle badges on an image.
- Markers that must keep a constant pixel size and optionally billboard (always face the camera).

For a scatter plot of thousands or millions of points, use [`ScatterplotShapeLayer`](scatter-plot-shape.md) instead — it accepts pre-interleaved typed arrays and has density-based sizing + LOD.

---

## Quick start

```ts
import { ShapeMarkerLayer } from '@bioturing-org/zavier';
import { COORDINATE_SYSTEM } from '@deck.gl/core';

type MarkerDatum = {
  position: [number, number, number];
  size: number;
  angle: number; // degrees
};

const data: MarkerDatum[] = [
  { position: [0, 0, 0], size: 20, angle: 0 },
  { position: [100, 50, 0], size: 16, angle: 45 },
];

const layer = new ShapeMarkerLayer<MarkerDatum>({
  id: 'markers',
  data,
  getPosition: (d) => d.position,
  getSize: (d) => d.size,
  getAngle: (d) => d.angle,
  getFillColor: () => [255, 255, 255, 255],
  getLineColor: () => [0, 0, 0, 255],
  getLineWidth: () => 1,
  getShape: 'square', // 'circle' | 'square'
  billboard: true, // keep facing the camera
  antialiasing: true,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  pickable: true,
});
```

Pass `layer` to your `Deck`/`DeckGL` `layers` array inside an `OrthographicView`.

---

## Props

### `ShapeMarkerLayerProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `LayerDataSource<DataT>` | — (required) | Iterable of marker records. |
| `getPosition` | `Accessor<DataT, Position>` | `(d) => d.position` | Marker center (`[x, y]` or `[x, y, z]`). |
| `getSize` | `Accessor<DataT, number>` | `10` | Marker size in pixels (full edge length for squares, diameter for circles). |
| `getAngle` | `Accessor<DataT, number>` | `0` | Rotation in degrees. Applied to the marker quad before billboard/offset. |
| `getFillColor` | `Accessor<DataT, Color>` | `[0,0,0,255]` | Fill color (RGBA 0–255). |
| `getLineColor` | `Accessor<DataT, Color>` | `[0,0,0,255]` | Outline color. Only drawn when `getLineWidth > 0`. |
| `getLineWidth` | `Accessor<DataT, number>` | `0` | Outline width in pixels. `0` = no outline. |
| `getShape` | `Accessor<DataT, ShapeMarkerShape>` | `'square'` | Per-marker shape: `'circle'` or `'square'`. |
| `billboard` | `boolean` | `true` | If `true`, markers always face the camera (screen-space). If `false`, they lie on the ground plane. |
| `antialiasing` | `boolean` | `true` | Smooth marker edges. |

Standard deck.gl `LayerProps` (`id`, `pickable`, `coordinateSystem`, `opacity`, `visible`, `modelMatrix`, `onHover`, `onClick`, …) are also accepted. Use `coordinateSystem: COORDINATE_SYSTEM.CARTESIAN` for non-geospatial data.

---

## `SHAPE_MARKER` and `ShapeMarkerShape`

```ts
export const SHAPE_MARKER = { circle: 0, square: 1 } as const;
export type ShapeMarkerShape = keyof typeof SHAPE_MARKER; // 'circle' | 'square'
```

Pass the string form (`'circle'` / `'square'`) to `getShape`. The layer maps it to the numeric value the shader expects.

---

## How rendering works

Each marker is an instanced quad. In the vertex shader:

1. The unit quad (`positions.xy ∈ [-1, 1]`) is scaled by `size * 0.5` to get `outerRadiusPixels`.
2. The quad is rotated by `angle` (degrees → radians), with the y-axis flipped so positive angles rotate clockwise on screen.
3. If `billboard` is `true`, the offset is applied in screen space (marker keeps constant pixel size and faces the camera). If `false`, the offset is converted to common space (marker scales with zoom and lies on the ground plane).

In the fragment shader, the shape is selected by `shapeType`:

- **Circle** — `dist = length(unitPosition) * outerRadiusPixels`; fragments with `dist > outerRadiusPixels` are discarded.
- **Square** — `dist = max(abs(unitPosition)) * outerRadiusPixels`; same discard test.

The fill vs. outline decision is `lineWidthPixels > 0 && dist >= borderDist ? lineColor : fillColor`, with an antialiasing `smoothstep` on the outer edge when `antialiasing` is on.

---

## Picking & interaction

`ShapeMarkerLayer` is fully pickable. Set `pickable: true` and use deck.gl's `onHover` / `onClick` / `onDragStart` / `onDrag` / `onDragEnd`. `PickingInfo.index` is the marker index in the `data` array.

Because each marker can have its own `angle`, this layer is ideal for handle squares that should rotate to align with an annotation line (e.g. cap handles on a `CappedLineLayer`).

---

## Example: endpoint handles for a capped line

This is the pattern used in the zavier dev app. Two square handles sit at the line's endpoints, rotated to match the line angle, and the user drags them to resize the line.

```tsx
import { ShapeMarkerLayer, CappedLineLayer } from '@bioturing-org/zavier';
import { COORDINATE_SYSTEM, type PickingInfo } from '@deck.gl/core';

type LineDatum = {
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
};
type HandleDatum = { position: [number, number, number]; size: number; angle: number };

function lineAngle(line: LineDatum): number {
  const dx = line.targetPosition[0] - line.sourcePosition[0];
  const dy = line.targetPosition[1] - line.sourcePosition[1];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function handleLayers(line: LineDatum, handleSize: number) {
  const angle = lineAngle(line);
  const handles: HandleDatum[] = [
    { position: line.sourcePosition, size: handleSize, angle },
    { position: line.targetPosition, size: handleSize, angle },
  ];

  return new ShapeMarkerLayer<HandleDatum>({
    id: 'line-handles',
    data: handles,
    getPosition: (d) => d.position,
    getSize: (d) => d.size,
    getAngle: (d) => -d.angle, // negate so it aligns with the line on screen
    getFillColor: () => [255, 255, 255, 255],
    getLineColor: () => [0, 0, 0, 255],
    getLineWidth: () => 1,
    getShape: 'square',
    billboard: true,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    pickable: true,
  });
}

// In onDrag, branch on info.index: 0 = move source, 1 = move target
function onDrag(info: PickingInfo, line: LineDatum, setLine: (l: LineDatum) => void) {
  if (!info.coordinate) return;
  const c: [number, number, number] = [info.coordinate[0], info.coordinate[1], 0];
  if (info.index === 0) setLine({ ...line, sourcePosition: c });
  else if (info.index === 1) setLine({ ...line, targetPosition: c });
}
```

---

## Performance notes

- Designed for a **small number** of markers (handles, anchors). For thousands+ of points, use `ScatterplotShapeLayer`.
- All sizing is in **pixels**, so markers keep a constant on-screen size when `billboard: true`.
- One instanced model draws all markers; recreate the layer (or update `data`) to change geometry.
- `getBounds()` is implemented over `instancePositions`, so deck.gl view fitting works.

---

## Common pitfalls

- **Marker rotated the wrong way** — `getAngle` is in degrees and the y-axis is flipped in the shader, so you often need to negate the angle to align with a line (see the handle example above).
- **No outline** — `getLineWidth` defaults to `0`. Set it ≥ 1 and provide a distinct `getLineColor`.
- **Markers scale with zoom** — that happens when `billboard: false`. Set `billboard: true` for constant pixel size.
- **Circle looks like a square** — `getShape` must return `'circle'` (or `'square'`). A typo or wrong accessor returns the default `'square'`.
- **`getShape` returning a number** — pass the string form (`'circle'` / `'square'`), not the numeric `SHAPE_MARKER` value. The layer maps the string to the number internally.
