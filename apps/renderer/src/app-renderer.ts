import puppeteer, { Browser } from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { App } from './type';

const RENDER_TIMEOUT_MS = 5000;

export interface RenderAppOptions {
  app: App;
  width: number;
  height: number;
  projectDir: string;
  outputName: string;
  title: string;
  date?: string;
  tags: string[];
  browser?: Browser; // optional shared browser instance
}

export interface AppRenderResult {
  app: App;
  screenshotPath: string;
}

function generateAppCacheKey(
  src: string,
  parameters: Record<string, string>,
  title: string,
  date: string | undefined,
  tags: string[],
  outputName: string,
): string {
  const hash = createHash('sha256');
  hash.update(src);
  hash.update(JSON.stringify(parameters));
  hash.update(title);
  hash.update(date ?? '');
  hash.update(tags.join(','));
  hash.update(outputName);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Renders a React (or any SPA) app to a PNG screenshot using Puppeteer.
 * The app must dispatch a "sts-render-complete" custom event on document
 * when it is fully rendered. If the event is not received within
 * RENDER_TIMEOUT_MS, an error is thrown.
 */
export async function renderApp(options: RenderAppOptions): Promise<AppRenderResult> {
  const { app, width, height, projectDir, outputName, title, date, tags, browser: sharedBrowser } = options;

  // Create cache directory
  const cacheDir = resolve(projectDir, 'cache', 'apps');
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  // Generate cache key from all inputs that affect output
  const cacheKey = generateAppCacheKey(
    app.src,
    app.parameters,
    title,
    date,
    tags,
    outputName,
  );
  const screenshotPath = resolve(cacheDir, `${cacheKey}.png`);

  // Return cached result if available
  if (existsSync(screenshotPath)) {
    console.log(
      `Using cached app "${app.id}" (hash: ${cacheKey}) from ${screenshotPath}`,
    );
    return { app, screenshotPath };
  }

  // Resolve index.html
  const appDir = isAbsolute(app.src)
    ? app.src
    : resolve(projectDir, app.src);
  const indexPath = resolve(appDir, 'index.html');

  if (!existsSync(indexPath)) {
    throw new Error(`App "${app.id}": index.html not found at ${indexPath}`);
  }

  // Build URL with query parameters.
  // Metadata (title, date, tags) is always injected; extra parameters from
  // data-parameters are merged in afterwards and can override metadata keys.
  const searchParams = new URLSearchParams({ rendering: '' });
  searchParams.set('title', title);
  if (date) searchParams.set('date', date);
  if (tags.length > 0) searchParams.set('tags', tags.join(','));
  for (const [key, value] of Object.entries(app.parameters)) {
    searchParams.set(key, value);
  }

  const url = `file://${indexPath}?${searchParams.toString()}`;

  console.log(`\nRendering app "${app.id}" from ${url}`);

  const ownBrowser = sharedBrowser
    ? null
    : await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
  const browser = sharedBrowser ?? ownBrowser!;

  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height });

    page.on('console', (msg) =>
      console.log(`[app:${app.id}] console.${msg.type()}: ${msg.text()}`),
    );
    page.on('pageerror', (err) =>
      console.error(`[app:${app.id}] page error: ${String(err)}`),
    );
    page.on('requestfailed', (req) =>
      console.error(`[app:${app.id}] request failed: ${req.url()} — ${req.failure()?.errorText}`),
    );

    // Initialise the flag before navigation. The app sets it to true directly
    // via window.__stsRenderComplete = true inside its useEffect, so no event
    // listener is needed on this side.
    await page.evaluateOnNewDocument(
      `window.__stsRenderComplete = false;`,
    );

    await page.goto(url, { waitUntil: 'networkidle0' });

    // Wait for the app to signal it is done rendering
    await page
      .waitForFunction('window.__stsRenderComplete === true', {
        timeout: RENDER_TIMEOUT_MS,
      })
      .catch(() => {
        throw new Error(
          `App "${app.id}" did not set window.__stsRenderComplete within ${RENDER_TIMEOUT_MS}ms`,
        );
      });

    // Screenshot with transparent background
    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width, height },
    });

    await writeFile(screenshotPath, screenshot);

    console.log(
      `Rendered app "${app.id}" (hash: ${cacheKey}) to ${screenshotPath}`,
    );

    return { app, screenshotPath };
  } finally {
    await page.close();
    if (ownBrowser) await ownBrowser.close();
  }
}

/**
 * Renders multiple apps in sequence, reusing a single browser instance.
 */
export async function renderApps(
  apps: App[],
  width: number,
  height: number,
  projectDir: string,
  outputName: string,
  title: string,
  date: string | undefined,
  tags: string[],
  activeCacheKeys?: Set<string>,
): Promise<AppRenderResult[]> {
  const results: AppRenderResult[] = [];

  // Launch once and reuse across all apps.
  // --allow-file-access-from-files is required so Chromium allows
  // <script type="module"> and <link> tags to load sibling files
  // when the page itself is served via file://.
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
    ],
  });

  try {
    for (const app of apps) {
      const cacheKey = generateAppCacheKey(
        app.src,
        app.parameters,
        title,
        date,
        tags,
        outputName,
      );

      if (activeCacheKeys) {
        activeCacheKeys.add(cacheKey);
      }

      const result = await renderApp({
        app,
        width,
        height,
        projectDir,
        outputName,
        title,
        date,
        tags,
        browser,
      });
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  return results;
}
