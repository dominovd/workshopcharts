import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://workshopcharts.com',
  trailingSlash: 'always',
  build: {
    // Every chart lives at /wire-gauge-chart/ — a real directory with index.html.
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  // No islands framework on purpose: DESIGN.md §9 requires every variant and
  // toggle to exist in the served DOM. Filtering and unit switching are done
  // with a few KB of vanilla JS over markup that is already complete.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
