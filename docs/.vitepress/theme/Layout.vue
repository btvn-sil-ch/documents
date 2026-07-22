<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';

const route = useRoute();

const isDark = ref(false);

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value);
}

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem('bt-theme', isDark.value ? 'dark' : 'light');
  applyTheme();
}

onMounted(() => {
  const saved = localStorage.getItem('bt-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  isDark.value = saved ? saved === 'dark' : prefersDark;
  applyTheme();
});

const sidebarOpen = ref(false);
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

const nav = [
  { text: 'Home', link: '/' },
  { text: 'upload-svc', link: '/upload-svc/' },
  { text: 'zavier', link: '/zavier/' },
];

const sidebars: Record<
  string,
  { text: string; items: { text: string; link: string }[] }[]
> = {
  '/upload-svc/': [
    {
      text: '@bioturing-org/upload-svc',
      items: [{ text: 'Overview', link: '/upload-svc/' }],
    },
  ],
  '/zavier/': [
    {
      text: '@bioturing-org/zavier',
      items: [{ text: 'Overview', link: '/zavier/' }],
    },
  ],
};

interface TocItem {
  text: string;
  link: string;
  depth: number;
}
const tocItems = ref<TocItem[]>([]);

function buildTocFromDom() {
  const main = document.querySelector('.bt-content');
  if (!main) {
    tocItems.value = [];
    return;
  }
  const headings = Array.from(main.querySelectorAll('h2, h3')) as HTMLElement[];

  const skipIds = new Set<string>();
  if (
    headings.length &&
    headings[0].textContent?.toLowerCase().includes('table of contents')
  ) {
    skipIds.add(headings[0].id);
  }
  tocItems.value = headings
    .filter((h) => !skipIds.has(h.id))
    .map((h) => ({
      text: h.textContent?.replace(/#$/, '').trim() ?? '',
      link: `#${h.id}`,
      depth: h.tagName === 'H2' ? 0 : 1,
    }));
}

const currentDocs = computed(() => {
  const path = route.path;
  const key = Object.keys(sidebars).find((k) => path.startsWith(k));
  if (!key) return [];
  return sidebars[key];
});

const currentToc = computed(() => tocItems.value);

const pageTitle = computed(() => {
  const path = route.path;
  if (path === '/') return 'Home';
  const match = nav.find((n) => path.startsWith(n.link.replace(/\/$/, '')));
  return match ? match.text : 'Docs';
});

const activeSlug = ref('');

let suppressScrollSpy = false;
let suppressTimer: ReturnType<typeof setTimeout> | null = null;

const SCROLL_OFFSET = 56;

function onTocScroll() {
  if (suppressScrollSpy) return;
  const items = currentToc.value;
  const headings = items
    .map((t) => {
      const id = t.link.split('#')[1];
      if (!id) return null;
      const el = document.getElementById(id);
      return el ? { link: t.link, el } : null;
    })
    .filter((x): x is { link: string; el: HTMLElement } => x !== null);

  if (!headings.length) {
    activeSlug.value = '';
    return;
  }


  let current = headings[0].link;
  for (const h of headings) {
    if (h.el.getBoundingClientRect().top <= SCROLL_OFFSET + 4) {
      current = h.link;
    } else {
      break;
    }
  }

  // When the page is scrolled to (or very near) the bottom, the last
  // heading can't be pushed above the trigger line because there isn't
  // enough content below it to let the page scroll that far. In that
  // case force-select the last heading so the outline highlights the
  // section the reader is actually viewing instead of the one above it.
  const scrollBottom = window.scrollY + window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  if (docHeight - scrollBottom < 4) {
    current = headings[headings.length - 1].link;
  }

  activeSlug.value = current;
}

onMounted(() => {
  buildTocFromDom();
  window.addEventListener('scroll', onTocScroll, { passive: true });
  onTocScroll();
});

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
    activeSlug.value = '';
    nextTick(() => {
      buildTocFromDom();
      requestAnimationFrame(onTocScroll);
    });
  },
);

function onTocClick(e: Event, link: string) {
  const id = link.split('#')[1];
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  activeSlug.value = link;
  suppressScrollSpy = true;
  if (suppressTimer) clearTimeout(suppressTimer);

  const headerOffset = 56;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.scrollTo({
    top: top,
    behavior: 'smooth',
  });


  history.replaceState(null, '', link);

  suppressTimer = setTimeout(() => {
    suppressScrollSpy = false;
    onTocScroll();
  }, 500);
}
</script>

<template>
  <div class="bt-app" :class="{ dark: isDark }">
    <!-- Header -->
    <header class="bt-header">
      <div class="bt-header__inner">
        <button
          class="bt-menu-btn"
          aria-label="Toggle menu"
          @click="toggleSidebar"
        >
          <span class="bt-menu-icon" />
        </button>

        <a href="/" class="bt-logo">
          <span class="bt-logo__mark">⬢</span>
          <span class="bt-logo__text">BioTuring</span>
        </a>

        <nav class="bt-nav">
          <a
            v-for="item in nav"
            :key="item.link"
            :href="item.link"
            class="bt-nav__link"
            :class="{
              'bt-nav__link--active':
                route.path === item.link ||
                (item.link !== '/' && route.path.startsWith(item.link)),
            }"
          >
            {{ item.text }}
          </a>
        </nav>

        <div class="bt-header__actions">
          <button
            class="bt-theme-toggle"
            :aria-label="
              isDark ? 'Switch to light mode' : 'Switch to dark mode'
            "
            @click="toggleTheme"
          >
            <span v-if="isDark">☀️</span>
            <span v-else>🌙</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <div class="bt-body">
      <!-- Left sidebar: documents of the current library -->
      <aside class="bt-sidebar" :class="{ 'bt-sidebar--open': sidebarOpen }">
        <div
          v-for="group in currentDocs"
          :key="group.text"
          class="bt-sidebar__group"
        >
          <p class="bt-sidebar__title">{{ group.text }}</p>
          <ul class="bt-sidebar__list">
            <li v-for="item in group.items" :key="item.link">
              <a
                class="bt-sidebar__link"
                :class="{
                  'bt-sidebar__link--active':
                    route.path === item.link ||
                    (item.link !== '/' &&
                      route.path.startsWith(item.link)),
                }"
                :href="item.link"
              >
                {{ item.text }}
              </a>
            </li>
          </ul>
        </div>
        <div v-if="!currentDocs.length" class="bt-sidebar__empty">
          No documents for this library.
        </div>
      </aside>

      <!-- Backdrop for mobile -->
      <div v-if="sidebarOpen" class="bt-backdrop" @click="toggleSidebar" />

      <!-- Main content -->
      <main class="bt-main">
        <div class="bt-content">
          <div class="bt-breadcrumb">
            <a href="/">Home</a>
            <span class="bt-breadcrumb__sep">/</span>
            <span>{{ pageTitle }}</span>
          </div>
          <Content />
        </div>

        <!-- Footer -->
        <footer class="bt-footer">
          <p class="bt-footer__message">Released under the MIT License.</p>
          <p class="bt-footer__copy">Copyright © 2026 BioTuring</p>
        </footer>
      </main>

      <!-- Right sidebar: on-this-page outline -->
      <aside class="bt-toc">
        <div v-if="currentToc.length" class="bt-toc__inner">
          <p class="bt-toc__title">On this page</p>
          <ul class="bt-toc__list">
            <li
              v-for="item in currentToc"
              :key="item.link"
              :style="
                item.depth ? { paddingLeft: `${10 + item.depth * 14}px` } : null
              "
            >
              <a
                class="bt-toc__link"
                :class="{
                  'bt-toc__link--active': activeSlug === item.link,
                  'bt-toc__link--sub': item.depth,
                }"
                role="link"
                tabindex="0"
                @click="onTocClick($event, item.link)"
                @keydown.enter="onTocClick($event, item.link)"
              >
                {{ item.text }}
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.bt-app {
  --bt-bg: #ffffff;
  --bt-bg-soft: #f7f8fa;
  --bt-bg-mute: #ebedf0;
  --bt-text: #1f2328;
  --bt-text-soft: #57606a;
  --bt-border: #d8dee4;
  --bt-brand: #3b82f6;
  --bt-brand-soft: #dbeafe;
  --bt-header-bg: rgba(255, 255, 255, 0.85);
  --bt-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bt-bg);
  color: var(--bt-text);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
    sans-serif;
}

.bt-app.dark {
  --bt-bg: #0d1117;
  --bt-bg-soft: #161b22;
  --bt-bg-mute: #21262d;
  --bt-text: #e6edf3;
  --bt-text-soft: #8b949e;
  --bt-border: #30363d;
  --bt-brand: #58a6ff;
  --bt-brand-soft: #1f2a40;
  --bt-header-bg: rgba(13, 17, 23, 0.85);
  --bt-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* ---- Header ---- */
.bt-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bt-header-bg);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--bt-border);
}

.bt-header__inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 56px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.bt-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  color: var(--bt-text);
  text-decoration: none;
}

.bt-logo__mark {
  color: var(--bt-brand);
  font-size: 22px;
}

.bt-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.bt-nav__link {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--bt-text-soft);
  text-decoration: none;
  transition:
    color 0.15s,
    background 0.15s;
}

.bt-nav__link:hover {
  color: var(--bt-text);
  background: var(--bt-bg-mute);
}

.bt-nav__link--active {
  color: var(--bt-brand);
  font-weight: 600;
}

.bt-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bt-theme-toggle {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--bt-border);
  background: var(--bt-bg-soft);
  color: var(--bt-text);
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}

.bt-theme-toggle:hover {
  background: var(--bt-bg-mute);
}

.bt-menu-btn {
  display: none;
  width: 36px;
  height: 36px;
  border: 1px solid var(--bt-border);
  border-radius: 8px;
  background: var(--bt-bg-soft);
  cursor: pointer;
  position: relative;
}

.bt-menu-icon,
.bt-menu-icon::before,
.bt-menu-icon::after {
  display: block;
  width: 16px;
  height: 2px;
  background: var(--bt-text);
  border-radius: 2px;
  position: absolute;
  left: 9px;
}

.bt-menu-icon {
  top: 17px;
}
.bt-menu-icon::before {
  content: '';
  top: -5px;
}
.bt-menu-icon::after {
  content: '';
  top: 5px;
}

/* ---- Body ---- */
.bt-body {
  flex: 1;
  display: flex;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* ---- Sidebar ---- */
.bt-sidebar {
  width: 260px;
  flex-shrink: 0;
  padding: 24px 16px;
  border-right: 1px solid var(--bt-border);
  position: sticky;
  top: 56px;
  align-self: flex-start;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

.bt-sidebar__group {
  margin-bottom: 24px;
}

.bt-sidebar__title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--bt-text-soft);
}

.bt-sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bt-sidebar__link {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--bt-text-soft);
  text-decoration: none;
  transition:
    color 0.15s,
    background 0.15s;
}

.bt-sidebar__link:hover {
  color: var(--bt-text);
  background: var(--bt-bg-mute);
}

.bt-sidebar__link--active {
  color: var(--bt-brand);
  font-weight: 600;
  background: var(--bt-brand-soft);
}

.bt-sidebar__link--sub {
  font-size: 13px;
  color: var(--bt-text-soft);
}

.bt-sidebar__empty {
  font-size: 13px;
  color: var(--bt-text-soft);
}

/* ---- Right TOC (On this page) ---- */
.bt-toc {
  width: 220px;
  flex-shrink: 0;
  padding: 24px 16px 24px 20px;
  border-left: 1px solid var(--bt-border);
  position: sticky;
  top: 56px;
  align-self: flex-start;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

.bt-toc__title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--bt-text-soft);
}

.bt-toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.bt-toc__link {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--bt-text-soft);
  text-decoration: none;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.bt-toc__link:hover {
  color: var(--bt-text);
  background: var(--bt-bg-mute);
}

.bt-toc__link--active {
  color: var(--bt-brand);
  font-weight: 600;
  background: var(--bt-brand-soft);
}

.bt-toc__link--sub {
  font-size: 12px;
  color: var(--bt-text-soft);
}

.bt-backdrop {
  display: none;
}

/* ---- Main ---- */
.bt-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.bt-content {
  padding: 28px 32px;
  flex: 1;
}

.bt-breadcrumb {
  font-size: 13px;
  color: var(--bt-text-soft);
  margin-bottom: 18px;
}

.bt-breadcrumb a {
  color: var(--bt-brand);
  text-decoration: none;
}

.bt-breadcrumb a:hover {
  text-decoration: underline;
}

.bt-breadcrumb__sep {
  margin: 0 6px;
  opacity: 0.6;
}

/* ---- Footer ---- */
.bt-footer {
  border-top: 1px solid var(--bt-border);
  padding: 18px 32px;
  text-align: center;
  font-size: 13px;
  color: var(--bt-text-soft);
}

.bt-footer__message {
  margin: 0 0 4px;
}

.bt-footer__copy {
  margin: 0;
}

/* Hide the right-side outline on tablet and narrower screens */
@media (max-width: 1023px) {
  .bt-toc {
    display: none;
  }
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .bt-menu-btn {
    display: block;
  }

  .bt-nav {
    display: none;
  }

  .bt-sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: 40;
    width: 280px;
    background: var(--bt-bg);
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: var(--bt-shadow);
  }

  .bt-sidebar--open {
    transform: translateX(0);
  }

  .bt-backdrop {
    display: block;
    position: fixed;
    inset: 56px 0 0 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 35;
  }

  .bt-content {
    padding: 20px 18px;
  }
}
</style>
