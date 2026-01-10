import {
  ParsedHtml,
  ProjectStructure,
  Asset,
  Output,
  Element,
  ASTNode,
} from './type';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve, dirname } from 'path';

const execFileAsync = promisify(execFile);

export async function prepareProject(
  html: ParsedHtml,
  projectPath: string,
): Promise<ProjectStructure> {
  const projectDir = dirname(projectPath);
  const assets = await processAssets(html, projectDir);
  const output = processOutput(html, projectDir);

  return {
    sequences: [],
    assets,
    output,
  };
}

/**
 * Processes asset elements from the parsed HTML and builds an assets map
 */
async function processAssets(
  html: ParsedHtml,
  projectDir: string,
): Promise<Map<string, Asset>> {
  const assetsMap = new Map<string, Asset>();

  // Find all elements with class "asset" or data-asset attribute
  const assetElements = findAssetElements(html);

  for (const element of assetElements) {
    const asset = await extractAssetFromElement(element, projectDir);
    if (asset) {
      assetsMap.set(asset.name, asset);
    }
  }

  return assetsMap;
}

/**
 * Finds all asset elements in the HTML
 */
function findAssetElements(html: ParsedHtml): Element[] {
  const results: Element[] = [];

  function traverse(node: ASTNode) {
    if ('tagName' in node) {
      const element = node as Element;

      // Check if element is an <asset> tag
      if (element.tagName === 'asset') {
        results.push(element);
      }
    }

    if ('childNodes' in node && node.childNodes) {
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }

  traverse(html.ast);
  return results;
}

/**
 * Extracts asset information from an element
 */
async function extractAssetFromElement(
  element: Element,
  projectDir: string,
): Promise<Asset | null> {
  const attrs = new Map(element.attrs.map((attr) => [attr.name, attr.value]));

  // Extract name (required)
  const name = attrs.get('data-name') || attrs.get('id');
  if (!name) {
    console.warn('Asset element missing data-name or id attribute');
    return null;
  }

  // Extract path (required)
  const relativePath = attrs.get('data-path') || attrs.get('src');
  if (!relativePath) {
    console.warn(`Asset "${name}" missing data-path or src attribute`);
    return null;
  }

  // Resolve to absolute path
  const absolutePath = resolve(projectDir, relativePath);

  // Extract type (required)
  let type: 'video' | 'image' | 'audio';
  const explicitType = attrs.get('data-type');
  if (
    explicitType === 'video' ||
    explicitType === 'image' ||
    explicitType === 'audio'
  ) {
    type = explicitType;
  } else {
    // Infer from tag name or file extension
    type = inferAssetType(element.tagName, relativePath);
  }

  // Get duration using ffprobe (in ms) - only for audio/video
  const duration = await getAssetDuration(absolutePath, type);

  // Extract author (optional)
  const author = attrs.get('data-author');

  return {
    name,
    path: absolutePath,
    type,
    duration,
    ...(author && { author }),
  };
}

/**
 * Infers asset type from tag name or file path
 */
function inferAssetType(
  tagName: string,
  path: string,
): 'video' | 'image' | 'audio' {
  // Check tag name first
  if (tagName === 'video') return 'video';
  if (tagName === 'img') return 'image';
  if (tagName === 'audio') return 'audio';

  // Check file extension
  const ext = path.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return 'image';
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(ext)) return 'audio';

  // Default to video
  return 'video';
}

/**
 * Gets the duration of an asset file using ffprobe
 * @param path - Path to the asset file
 * @param type - Asset type (video, audio, or image)
 * @returns Duration in milliseconds
 */
async function getAssetDuration(
  path: string,
  type: 'video' | 'image' | 'audio',
): Promise<number> {
  // Images don't have duration, skip ffprobe
  if (type === 'image') {
    return 0;
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      path,
    ]);

    const durationSeconds = parseFloat(stdout.trim());
    if (isNaN(durationSeconds)) {
      console.warn(`Could not parse duration for asset: ${path}`);
      return 0;
    }

    return Math.round(durationSeconds * 1000);
  } catch (error) {
    console.error(`Failed to get duration for asset: ${path}`, error);
    return 0;
  }
}

/**
 * Processes output configuration from the parsed HTML
 */
function processOutput(html: ParsedHtml, projectDir: string): Output {
  const outputElements = findOutputElements(html);

  // Use first output element, or return defaults if none found
  if (outputElements.length === 0) {
    console.warn('No output elements found, using defaults');
    return {
      name: 'output',
      path: resolve(projectDir, './output/video.mp4'),
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    };
  }

  const element = outputElements[0];
  const attrs = new Map(element.attrs.map((attr) => [attr.name, attr.value]));

  // Extract name
  const name = attrs.get('name') || 'output';

  // Extract and resolve path
  const relativePath = attrs.get('path') || './output/video.mp4';
  const path = resolve(projectDir, relativePath);

  // Extract and parse resolution (format: "1920x1080")
  const resolutionStr = attrs.get('resolution') || '1920x1080';
  const [widthStr, heightStr] = resolutionStr.split('x');
  const resolution = {
    width: parseInt(widthStr, 10) || 1920,
    height: parseInt(heightStr, 10) || 1080,
  };

  // Extract fps
  const fpsStr = attrs.get('fps');
  const fps = fpsStr ? parseInt(fpsStr, 10) : 30;

  return {
    name,
    path,
    resolution,
    fps,
  };
}

/**
 * Finds all output elements in the HTML
 */
function findOutputElements(html: ParsedHtml): Element[] {
  const results: Element[] = [];

  function traverse(node: ASTNode) {
    if ('tagName' in node) {
      const element = node as Element;

      // Check if element is an <output> tag
      if (element.tagName === 'output') {
        results.push(element);
      }
    }

    if ('childNodes' in node && node.childNodes) {
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }

  traverse(html.ast);
  return results;
}
