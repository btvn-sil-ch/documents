# Getting started

This guide covers installation and authentication, then shows a minimal "hello world" viewer. Layer-specific usage (props, examples, tuning) lives in the per-layer docs:

- [Zarr image layer](layers/zarr-image.md)
- [Polygon layer](layers/polygon.md)
- [ScatterplotShape layer](layers/scatter-plot-shape.md)
- [Capped line layer](layers/capped-line.md)
- [Shape marker layer](layers/shape-marker.md)
- [React hooks](react-hooks.md)

---

## 1. Authenticate to GitHub Packages

`@bioturing-org/zavier` is published to GitHub Packages, not the public npm registry. You need a `NODE_AUTH_TOKEN` to install it — **this token is provided to you by the BioTuring organization**.

### Configure `.npmrc`

Create or edit `.npmrc` in your project root (or `~/.npmrc` for global use):

```ini
@bioturing-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

- The first line scopes the `@bioturing-org` org to the GitHub Packages registry.
- The second line reads the token from the `NODE_AUTH_TOKEN` environment variable, so you don't hardcode the secret in the file.

### Export the token to your device

The `.npmrc` above references `${NODE_AUTH_TOKEN}`, so you must export that variable in your shell **before running `npm install`**. Set it to the token value the org gave you.

**macOS / Linux (zsh or bash)** — persist it across terminal sessions by adding it to your shell profile:

```bash
echo 'export NODE_AUTH_TOKEN=<ghp_node_auth_token>' >> ~/.zshrc
source ~/.zshrc   # reload the profile in the current terminal
```

> If you use bash instead of zsh, replace `~/.zshrc` with `~/.bashrc`.

**Verify it is set** before installing:

```bash
echo $NODE_AUTH_TOKEN     # should print the token
npm config get //npm.pkg.github.com/:_authToken   # should resolve to the token
```

**Windows (PowerShell)** — set it for the current session:

```powershell
$env:NODE_AUTH_TOKEN = "<ghp_node_auth_token>"
```

Or persist it as a user environment variable:

```powershell
[Environment]::SetEnvironmentVariable("NODE_AUTH_TOKEN", "<ghp_node_auth_token>", "User")
# then open a new terminal
```

> Never commit the token to version control. Keep it in your shell profile or a secrets manager, and ensure `.npmrc` only references `${NODE_AUTH_TOKEN}`, not the literal value.

### CI (GitHub Actions)

Store the org-issued token as a repository secret named `NODE_AUTH_TOKEN`, then reference it in the install step:

```yaml
- run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
```

---

## 2. Install

```bash
npm install @bioturing-org/zavier
```

### Required peer dependencies

```bash
npm install @deck.gl/core@9.1.15 @deck.gl/layers@9.1.15 \
            @luma.gl/core@9.1.10 @luma.gl/engine@9.1.10 \
            @luma.gl/shadertools@9.1.10 @luma.gl/webgl@9.1.10 \
            kdbush@>=4.0.2
```

### Optional (React integration only)

```bash
npm install react@>=18 react-dom@>=18 @deck.gl/react@9.1.15
```

React is a **peer dependency marked optional** — the core library works without it. You only need `react`/`react-dom` if you import from `@bioturing-org/zavier/react`.

> zavier is ESM-only and ships TypeScript types. It works with Vite, webpack 5, esbuild, and Rollup.

---

## 3. Import

Two subpath imports are available:

```ts
// Core (vanilla TS) — no React required
import { ZarrImageLayer, ScatterplotShapeLayer } from '@bioturing-org/zavier';

// React integration (optional)
import { useViewportBounds, useLODThreshold } from '@bioturing-org/zavier/react';
```

The root path re-exports both, so `import { ... } from '@bioturing-org/zavier'` always works.

---

## 4. Minimal viewer (hello world)

zavier layers are standard deck.gl layers. You construct them with `new LayerName({ ...props })` and pass them to the `layers` array of any deck.gl `Deck` or `DeckGL` instance.

The example below renders a single `ScatterplotShapeLayer` of three colored circles inside a React `DeckGL` canvas — the smallest possible zavier setup. It uses an orthographic (2D Cartesian) view, which is the correct view type for all zavier layers.

```tsx
import { COORDINATE_SYSTEM, OrthographicView, type OrthographicViewState } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { useState } from 'react';
import { ScatterplotShapeLayer, ScatterShape } from '@bioturing-org/zavier';

export default function App() {
  const [viewState, setViewState] = useState<OrthographicViewState>({
    target: [0, 0],
    zoom: 0,
  });

  const layers = [
    new ScatterplotShapeLayer({
      id: 'hello-points',
      positions: new Float32Array([0, 0, 50, 0, 25, 40]), // [x1,y1, x2,y2, x3,y3]
      radii: new Float32Array([10, 10, 10]),
      fillColors: new Uint8Array([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
      ]),
      colorFormat: 'RGBA',
      shapeType: ScatterShape.CIRCLE,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      radiusUnits: 'pixels',
      stroked: false,
      filled: true,
      pickable: true,
    }),
  ];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <DeckGL
        width="100%"
        height="100%"
        views={[new OrthographicView({ id: 'main' })]}
        viewState={{ main: viewState }}
        layers={layers}
        controller={{ dragMode: 'pan', scrollZoom: true }}
        onViewStateChange={({ viewState: next }) =>
          setViewState(next as OrthographicViewState)
        }
      />
    </div>
  );
}
```

If everything is wired up, you should see three colored circles you can pan and zoom around.

### Vanilla (non-React) equivalent

```ts
import { COORDINATE_SYSTEM, OrthographicView, Deck } from '@deck.gl/core';
import { ScatterplotShapeLayer, ScatterShape } from '@bioturing-org/zavier';

const deck = new Deck({
  canvas: 'deck-canvas',
  views: [new OrthographicView({ id: 'main' })],
  viewState: { main: { target: [0, 0], zoom: 0 } },
  layers: [
    new ScatterplotShapeLayer({
      id: 'hello-points',
      positions: new Float32Array([0, 0, 50, 0, 25, 40]),
      radii: new Float32Array([10, 10, 10]),
      fillColors: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
      colorFormat: 'RGBA',
      shapeType: ScatterShape.CIRCLE,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      radiusUnits: 'pixels',
      pickable: true,
    }),
  ],
});
```

---

## 5. General usage pattern

Regardless of which layer you use, the workflow is the same:

1. **Create a layer** with `new LayerName({ id, ...dataProps, ...styleProps })`.
2. **Pass it to deck.gl** via the `layers` array on `Deck` / `DeckGL`.
3. **Update by recreating** the layer with new props (deck.gl diffing handles GPU updates efficiently). For high-throughput layers like `ScatterplotShapeLayer`, mutate the typed-array buffers and pass the same array reference to avoid reallocation.
4. **Use an orthographic view** for 2D Cartesian data.

Each layer doc explains its own data formats, props, and performance notes. Start with the layer you need:

- Streaming a multi-channel image → [Zarr image layer](layers/zarr-image.md)
- Rendering segmentation masks → [Polygon layer](layers/polygon.md)
- Plotting millions of cells → [ScatterplotShape layer](layers/scatter-plot-shape.md)
- Measurement / annotation lines → [Capped line layer](layers/capped-line.md)
- Draggable handles / anchors → [Shape marker layer](layers/shape-marker.md)
- Viewport-aware LOD and spatial queries → [React hooks](react-hooks.md)

---

## Troubleshooting setup

- **`npm ERR! 401 Unauthorized`** — your `NODE_AUTH_TOKEN` is missing, expired, or lacks `read:packages`. Re-export it in the shell running `npm install` and confirm `.npmrc` has the `@bioturing-org:registry` line.
- **`npm ERR! 404 Not Found`** — the `@bioturing-org` scope is not mapped to GitHub Packages in `.npmrc`, so npm is looking on the public registry.
- **Type errors on import** — ensure `moduleResolution` is `bundler` or `node16`/`nodenext` in your `tsconfig.json`, since zavier uses subpath `exports`.
- **`Module not found: react`** — you imported from `@bioturing-org/zavier/react` without installing `react`/`react-dom`. Either install them or import from the core path.
- **Blank canvas** — check the `viewState` target/zoom covers your data bounds, and that `coordinateSystem` is `CARTESIAN` for non-geospatial data.
