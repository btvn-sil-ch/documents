# BioTuring library Docs

Documentation site for the JavaScript library, built with [VitePress](https://vitepress.dev/).

## Development

```bash
npm install
npm run docs:dev
```

## Build

```bash
npm run docs:build
```

## Deployment

This site is automatically deployed to GitHub Pages via the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

To enable deployment:

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Push to the `main` branch to trigger the first deployment.
