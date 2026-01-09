/**
 * Utilities for resolving asset durations using ffprobe
 */

export interface AssetDuration {
  assetName: string;
  assetPath: string;
  durationSeconds?: number;
}

/**
 * Generate bash commands to probe asset durations
 * @param assets - List of assets with paths
 * @returns Bash script to resolve durations
 */
export function generateDurationProbeScript(
  assets: AssetDuration[]
): string {
  const lines: string[] = ['#!/bin/bash', ''];

  for (const asset of assets) {
    const varName = `DURATION_${asset.assetName.toUpperCase()}`;
    lines.push(
      `${varName}=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${asset.assetPath}")`
    );
    lines.push(`echo "${asset.assetName}: $${varName}s"`);
  }

  return lines.join('\n');
}

/**
 * Generate a comment block explaining how to resolve 100% durations
 */
export function generateDurationResolutionComment(
  fragmentsWithPercentage: Array<{
    asset: string;
    path: string;
  }>
): string {
  const lines: string[] = [
    '# NOTE: The following fragments use 100% duration (full asset duration):',
  ];

  for (const frag of fragmentsWithPercentage) {
    lines.push(`#   - ${frag.asset}: ${frag.path}`);
  }

  lines.push('#');
  lines.push('# To resolve these durations, run ffprobe:');

  for (const frag of fragmentsWithPercentage) {
    const varName = `DURATION_${frag.asset.toUpperCase()}`;
    lines.push(
      `#   ${varName}=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${frag.path}")`
    );
  }

  return lines.join('\n');
}
