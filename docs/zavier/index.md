## 📦 Installation

```bash
# Install zavier
npm install zavier

# Install peer dependencies (required)
npm install @deck.gl/core @deck.gl/layers \
            @luma.gl/core @luma.gl/engine @luma.gl/shadertools @luma.gl/webgl
```

---

## ✨ Features

- 🧩 **Multi-resolution pyramid** loading (Zarr NGFF-compatible)
- 🎨 **Multi-channel rendering** with real-time LUT / gamma adjustment
- ⚡ **Smooth pan and zoom** for images up to 60k × 60k pixels
- 🔁 **General transformation** support (translation, rotation, scaling, TPS,...)
- 🧠 **Async, on-demand tile loading** via [Zarrita](https://github.com/manzt/zarrita.js/)
- 🧱 **TypeScript-first** with full unit and performance tests
- 🧪 CI/CD integrated and benchmarked for consistency

---

# @bioturing/zavier

Custom deck.gl layers for advanced data visualization.

## Installation

```bash
npm install @bioturing/zavier
# or
yarn add @bioturing/zavier
```

## Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install @deck.gl/core @deck.gl/layers @luma.gl/core @luma.gl/engine @luma.gl/shadertools @luma.gl/webgl
```

## Usage

### Import Types

```typescript
import type {
  ColorRGBA,
  ColorRGB,
  Position2D,
  Position3D,
  Position,
  BoundingBox2D,
  Accessor,
  ColorRange,
} from '@bioturing/zavier';
```

### Color Utilities

```typescript
import {
  hexToRGB,
  rgbToHex,
  interpolateColor,
  getColorFromRange,
  createColorScale,
  DEFAULT_COLOR_RANGES,
} from '@bioturing/zavier';

// Convert hex to RGB
const red = hexToRGB('#ff0000'); // [255, 0, 0]

// Interpolate between colors
const orange = interpolateColor([255, 0, 0], [255, 255, 0], 0.5); // [255, 127, 0]

// Get color from range
const color = getColorFromRange(DEFAULT_COLOR_RANGES.heatmap, 0.5);

// Create a color scale function
const colorScale = createColorScale(DEFAULT_COLOR_RANGES.viridis, 0, 100);
const valueColor = colorScale(50);
```

### Geometry Utilities

```typescript
import {
  distance2D,
  getBoundingBox2D,
  getBoundingBoxCenter2D,
  generateCirclePoints,
  resolveAccessor,
} from '@bioturing/zavier';

// Calculate distance
const dist = distance2D([0, 0], [3, 4]); // 5

// Get bounding box
const bbox = getBoundingBox2D([[0, 0], [10, 5], [5, 10]]);
// [0, 0, 10, 10]

// Get center
const center = getBoundingBoxCenter2D([0, 0, 100, 50]); // [50, 25]

// Generate circle points
const points = generateCirclePoints([0, 0], 10, 8);

// Resolve accessor
const getValue = resolveAccessor;
const value1 = getValue(42, {}); // 42
const value2 = getValue((d: { x: number }) => d.x, { x: 10 }); // 10
```

### Math Utilities

```typescript
import {
  clamp,
  lerp,
  mapRange,
  normalize,
  smoothstep,
  easing,
} from '@bioturing/zavier';

// Clamp value
const clamped = clamp(150, 0, 100); // 100

// Linear interpolation
const interpolated = lerp(0, 100, 0.5); // 50

// Map range
const mapped = mapRange(50, 0, 100, 0, 1); // 0.5

// Normalize
const normalized = normalize(50, 0, 100); // 0.5

// Smooth step
const smooth = smoothstep(0, 100, 50); // 0.5

// Easing functions
const easedValue = easing.easeInOutCubic(0.5);
```

### Shader Utilities

```typescript
import { shaderUtils, shaderModule } from '@bioturing/zavier';

// Use with luma.gl shader modules
// shaderUtils contains GLSL utility functions
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `ColorRGBA` | RGBA color tuple with values 0-255 |
| `ColorRGB` | RGB color tuple with values 0-255 |
| `Position2D` | 2D position coordinate [x, y] |
| `Position3D` | 3D position coordinate [x, y, z] |
| `Position` | 2D or 3D position |
| `BoundingBox2D` | 2D bounding box [minX, minY, maxX, maxY] |
| `BoundingBox3D` | 3D bounding box [minX, minY, minZ, maxX, maxY, maxZ] |
| `Accessor<DataT, ReturnT>` | Accessor function or value |
| `ColorRange` | Array of RGB colors for gradients |

### Color Utilities

| Function | Description |
|----------|-------------|
| `hexToRGB(hex)` | Convert hex color to RGB |
| `rgbToHex(rgb)` | Convert RGB to hex string |
| `rgbToRGBA(rgb, alpha)` | Convert RGB to RGBA |
| `interpolateColor(c1, c2, t)` | Interpolate between two colors |
| `getColorFromRange(range, t)` | Get color from color range |
| `createColorScale(range, min, max)` | Create color scale function |
| `adjustBrightness(color, factor)` | Adjust color brightness |
| `getLuminance(color)` | Calculate color luminance |
| `getContrastingTextColor(bgColor)` | Get black or white text color |

### Geometry Utilities

| Function | Description |
|----------|-------------|
| `distance2D(p1, p2)` | Distance between 2D points |
| `distance3D(p1, p2)` | Distance between 3D points |
| `midpoint(p1, p2)` | Midpoint between positions |
| `getBoundingBox2D(positions)` | Calculate 2D bounding box |
| `getBoundingBox3D(positions)` | Calculate 3D bounding box |
| `pointInBoundingBox2D(point, bbox)` | Check if point is in bbox |
| `getBoundingBoxCenter2D(bbox)` | Get bbox center |
| `getBoundingBoxSize2D(bbox)` | Get bbox width and height |
| `normalizePosition(pos, bbox)` | Normalize position to [0,1] |
| `generateCirclePoints(center, radius, n)` | Generate circle points |
| `resolveAccessor(accessor, data)` | Resolve accessor function or value |

### Math Utilities

| Function | Description |
|----------|-------------|
| `clamp(value, min, max)` | Clamp value to range |
| `lerp(a, b, t)` | Linear interpolation |
| `mapRange(value, inMin, inMax, outMin, outMax)` | Map value between ranges |
| `getRange(values)` | Get min and max from array |
| `normalize(value, min, max)` | Normalize to [0, 1] |
| `mean(values)` | Calculate mean |
| `standardDeviation(values)` | Calculate std dev |
| `range(start, end, step)` | Generate number sequence |
| `approximatelyEqual(a, b, epsilon)` | Check approximate equality |
| `smoothstep(edge0, edge1, x)` | Smooth step function |
| `easing` | Object with easing functions |
| `degreesToRadians(degrees)` | Convert degrees to radians |
| `radiansToDegrees(radians)` | Convert radians to degrees |

## Development

```bash
# Install dependencies
yarn install

# Build library
yarn build

# Run tests
yarn test

# Type check
yarn typecheck

# Lint
yarn lint

# Format
yarn format
```

## License

MIT
