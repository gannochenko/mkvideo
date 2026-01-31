import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { Container } from './type';

export interface RenderContainerOptions {
  container: Container;
  cssText: string;
  width: number;
  height: number;
  projectDir: string;
}

export interface ContainerRenderResult {
  container: Container;
  screenshotPath: string;
}

/**
 * Generates a hash from container content and CSS
 */
function generateCacheKey(containerHtml: string, cssText: string): string {
  const hash = createHash('sha256');
  hash.update(containerHtml);
  hash.update(cssText);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Renders a container to a PNG screenshot using Puppeteer
 */
export async function renderContainer(
  options: RenderContainerOptions,
): Promise<ContainerRenderResult> {
  const { container, cssText, width, height, projectDir } = options;

  // Create cache directory
  const cacheDir = resolve(projectDir, '.cache', 'containers');
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }

  // Generate cache key from content hash
  const cacheKey = generateCacheKey(container.htmlContent, cssText);
  const screenshotPath = resolve(cacheDir, `${cacheKey}.png`);

  // Build complete HTML document
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: transparent;
      font-size: 16px;
    }
    ${cssText}
  </style>
</head>
<body>
  ${container.htmlContent}
</body>
</html>
  `.trim();

  // Launch browser and render
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Take screenshot with transparent background
    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: {
        x: 0,
        y: 0,
        width,
        height,
      },
    });

    // Save to file
    await writeFile(screenshotPath, screenshot);

    console.log(
      `Rendered container "${container.id}" (hash: ${cacheKey}) to ${screenshotPath}`,
    );

    return {
      container,
      screenshotPath,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Renders multiple containers in sequence
 */
export async function renderContainers(
  containers: Container[],
  cssText: string,
  width: number,
  height: number,
  projectDir: string,
): Promise<ContainerRenderResult[]> {
  const results: ContainerRenderResult[] = [];

  for (const container of containers) {
    const result = await renderContainer({
      container,
      cssText,
      width,
      height,
      projectDir,
    });
    results.push(result);
  }

  return results;
}
