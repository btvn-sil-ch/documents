---
title: BioTuring Library Docs
---

<div class="bt-hero">
  <h1 class="bt-hero__title">BioTuring Library Docs</h1>
  <p class="bt-hero__tagline">Documentation for BioTuring JavaScript libraries.</p>
</div>

<div class="bt-features">
  <a class="bt-card" href="/upload-svc/">
    <h3 class="bt-card__title">Upload-svc</h3>
    <p class="bt-card__desc">Browser & Node TypeScript SDK for chunked, resumable, integrity-verified file & folder uploads.</p>
    <span class="bt-card__link">Read the docs →</span>
  </a>

  <a class="bt-card" href="/zavier/">
    <h3 class="bt-card__title">Zavier</h3>
    <p class="bt-card__desc">Custom deck.gl layers for advanced multi-resolution data visualization.</p>
    <span class="bt-card__link">Read the docs →</span>
  </a>
</div>

<style>
.bt-hero {
  text-align: center;
  padding: 56px 20px 40px;
}

.bt-hero__title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  border-bottom: none;
  color: var(--bt-text);
}

.bt-hero__tagline {
  font-size: 1.1rem;
  color: var(--bt-text-soft);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.bt-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  margin: 8px 0 48px;
}

.bt-card {
  display: flex;
  flex-direction: column;
  padding: 22px 24px;
  border-radius: 12px;
  border: 1px solid var(--bt-border);
  background: var(--bt-bg-soft);
  text-decoration: none;
  color: var(--bt-text);
  transition: transform 0.15s ease, border-color 0.15s, box-shadow 0.15s;
}

.bt-card:hover {
  text-decoration: none;
  transform: translateY(-2px);
  border-color: var(--bt-brand);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.bt-card__title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--bt-text);
  border-bottom: none;
}

.bt-card__desc {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--bt-text-soft);
  line-height: 1.6;
  flex: 1;
}

.bt-card__link {
  font-size: 14px;
  font-weight: 600;
  color: var(--bt-brand);
}

@media (max-width: 640px) {
  .bt-hero__title { font-size: 1.9rem; }
  .bt-hero { padding: 36px 16px 28px; }
}
</style>
