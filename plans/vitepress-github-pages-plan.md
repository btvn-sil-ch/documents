# VitePress + GitHub Pages Documentation Plan

## Decision
- **Framework:** VitePress
- **Hosting:** GitHub Pages (free for public organization repositories)
- **Repo visibility:** Public

## Project Layout
```
jslibsdoc/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow for GitHub Pages
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts         # VitePress configuration (base URL, nav, sidebar)
│   │   └── theme/
│   │       └── custom.css    # Optional theme overrides
│   ├── index.md              # Homepage
│   ├── guide/
│   │   └── getting-started.md
│   ├── api/
│   │   └── index.md
│   └── public/
│       └── logo.png          # Static assets
├── package.json
└── README.md
```

## Key Configuration Notes
- Set `base: '/jslibsdoc/'` in [`docs/.vitepress/config.ts`](docs/.vitepress/config.ts) so assets resolve correctly under the repository's GitHub Pages path.
- Output directory defaults to `docs/.vitepress/dist`.
- GitHub Actions workflow will:
  1. Checkout the repo.
  2. Install Node.js and dependencies.
  3. Run `vitepress build docs`.
  4. Upload `docs/.vitepress/dist` as a Pages artifact.
  5. Deploy to GitHub Pages.

## Next Steps
1. Switch to Code mode to scaffold the files above.
2. Run `npm install` and verify `npm run docs:build` locally.
3. Enable GitHub Pages from GitHub Actions in the repository settings.
4. Push to `main` to trigger the first deployment.
