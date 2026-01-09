import {
  type ParsedProject,
  type Element,
  findElementsByTagName,
  getComputedStyles,
} from './parser.js';

interface Asset {
  name: string;
  path: string;
  author?: string;
}

interface Output {
  name: string;
  path: string;
  resolution: string;
  fps: string;
}

interface FragmentTimeline {
  element: Element;
  asset?: string;
  assetPath?: string;
  duration: string; // e.g., "5s", "100%"
  durationSeconds?: number; // resolved duration in seconds
  offsetStart: number; // calculated in seconds (can be negative for overlaps)
  offsetEnd: number; // calculated in seconds
  absoluteStart: number; // absolute position in sequence timeline
  absoluteEnd: number; // absolute position in sequence timeline
  zIndex: number;
  transitions: {
    in?: string;
    out?: string;
  };
  blendMode?: string;
  marginLeft: number;
  marginRight: number;
  classes: string[];
  inputIndex: number; // FFmpeg input index
}

interface SequenceTimeline {
  fragments: FragmentTimeline[];
  totalDuration: number;
  sequenceIndex: number;
}

/**
 * Generates an FFmpeg command from a parsed project
 */
export class FFmpegGenerator {
  private project: ParsedProject;
  private assets: Map<string, Asset>;
  private outputs: Output[];
  private usedAssets: string[]; // Ordered list of used assets
  private assetInputMap: Map<string, number>; // Maps asset name to input index

  constructor(project: ParsedProject) {
    this.project = project;
    this.assets = this.extractAssets();
    this.outputs = this.extractOutputs();
    this.usedAssets = [];
    this.assetInputMap = new Map();
    this.buildAssetInputMap();
  }

  /**
   * Build a mapping of asset names to FFmpeg input indices
   */
  private buildAssetInputMap() {
    const sequences = this.buildTimelines();
    const usedAssetSet = new Set<string>();

    // Collect all used assets
    for (const seq of sequences) {
      for (const frag of seq.fragments) {
        if (frag.asset) {
          usedAssetSet.add(frag.asset);
        }
      }
    }

    // Create ordered list and mapping
    this.usedAssets = Array.from(usedAssetSet);
    this.usedAssets.forEach((assetName, idx) => {
      this.assetInputMap.set(assetName, idx);
    });
  }

  /**
   * Check if an asset is audio-only based on file extension
   */
  private isAudioAsset(path: string): boolean {
    const audioExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'];
    const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
    return audioExtensions.includes(ext);
  }

  /**
   * Extract all assets from the project
   */
  private extractAssets(): Map<string, Asset> {
    const assetElements = findElementsByTagName(this.project.ast, 'asset');
    const assetMap = new Map<string, Asset>();

    for (const el of assetElements) {
      const name = el.attrs.find((a) => a.name === 'name')?.value;
      const path = el.attrs.find((a) => a.name === 'path')?.value;
      const author = el.attrs.find((a) => a.name === 'author')?.value;

      if (name && path) {
        assetMap.set(name, { name, path, author });
      }
    }

    return assetMap;
  }

  /**
   * Extract all outputs from the project
   */
  private extractOutputs(): Output[] {
    const outputElements = findElementsByTagName(this.project.ast, 'output');
    return outputElements.map((el) => ({
      name: el.attrs.find((a) => a.name === 'name')?.value || 'output',
      path: el.attrs.find((a) => a.name === 'path')?.value || './output.mp4',
      resolution:
        el.attrs.find((a) => a.name === 'resolution')?.value || '1920x1080',
      fps: el.attrs.find((a) => a.name === 'fps')?.value || '30',
    }));
  }

  /**
   * Get class names from an element
   */
  private getClassNames(element: Element): string[] {
    const classAttr = element.attrs.find((a) => a.name === 'class');
    return classAttr ? classAttr.value.split(/\s+/).filter(Boolean) : [];
  }

  /**
   * Build timeline for all sequences
   */
  private buildTimelines(): SequenceTimeline[] {
    const sequences = findElementsByTagName(this.project.ast, 'sequence');
    return sequences.map((seq, idx) => this.buildSequenceTimeline(seq, idx));
  }

  /**
   * Build timeline for a single sequence
   */
  private buildSequenceTimeline(
    sequence: Element,
    sequenceIndex: number
  ): SequenceTimeline {
    const fragments = findElementsByTagName(sequence, 'fragment');
    const timeline: FragmentTimeline[] = [];
    let absolutePosition = 0; // The "cursor" position in the timeline

    for (const frag of fragments) {
      const styles = getComputedStyles(frag, this.project.elements);
      const classes = this.getClassNames(frag);

      // Extract properties from styles
      const width = styles['width'] || '0s';
      const asset = styles['-asset'];
      const zIndex = parseInt(styles['z-index'] || '0', 10);
      const transitionOut = styles['-transition-out'];
      const blendMode = styles['-blend-mode'];
      const marginLeft = this.parseDuration(styles['margin-left'] || '0s');
      const marginRight = this.parseDuration(styles['margin-right'] || '0s');

      // Get asset path
      const assetData = asset ? this.assets.get(asset) : undefined;
      const assetPath = assetData?.path;

      // Parse duration (handle percentage later)
      const durationSeconds = this.parseDuration(width);

      // Calculate absolute positions
      // Negative marginLeft means this fragment starts BEFORE the previous one ends
      absolutePosition += marginLeft;
      const absoluteStart = absolutePosition;
      const absoluteEnd = absoluteStart + durationSeconds;

      const fragmentData: FragmentTimeline = {
        element: frag,
        asset,
        assetPath,
        duration: width,
        durationSeconds,
        offsetStart: marginLeft, // Offset relative to previous fragment
        offsetEnd: marginRight,
        absoluteStart,
        absoluteEnd,
        zIndex,
        transitions: {
          out: transitionOut,
        },
        blendMode,
        marginLeft,
        marginRight,
        classes,
        inputIndex: this.getAssetInputIndex(asset || ''),
      };

      timeline.push(fragmentData);

      // Move cursor forward by fragment duration + right margin
      absolutePosition = absoluteEnd + marginRight;
    }

    // Calculate total duration (the furthest point any fragment reaches)
    const totalDuration = Math.max(
      ...timeline.map((f) => f.absoluteEnd + f.marginRight),
      0
    );

    return {
      fragments: timeline,
      totalDuration,
      sequenceIndex,
    };
  }

  /**
   * Parse duration string to seconds (basic implementation)
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(-?[\d.]+)s$/);
    if (match) {
      return parseFloat(match[1]);
    }
    return 0;
  }

  /**
   * Generate FFmpeg inputs list
   */
  private generateInputs(): string[] {
    const inputs: string[] = [];

    // Generate input flags in the correct order
    for (const assetName of this.usedAssets) {
      const asset = this.assets.get(assetName);
      if (asset) {
        inputs.push(`-i ${asset.path}`);
      }
    }

    return inputs;
  }

  /**
   * Generate filter_complex for video composition
   */
  private generateFilterComplex(): string {
    const allSequences = this.buildTimelines();
    const filters: string[] = [];
    const output = this.outputs[0];
    const [width, height] = output.resolution.split('x');

    // TODO: Handle multi-sequence composition properly
    // For now, only process the first sequence (main video)
    const sequences = [allSequences[0]];

    // First, prepare all fragment streams
    sequences.forEach((seq) => {
      seq.fragments.forEach((frag, fragIdx) => {
        const label = `s${seq.sequenceIndex}f${fragIdx}`;

        if (frag.asset && frag.inputIndex >= 0 && frag.assetPath) {
          // Skip audio-only assets (they don't have video streams)
          if (this.isAudioAsset(frag.assetPath)) {
            // Generate silent black video for audio fragments
            filters.push(
              `color=c=black:s=${width}x${height}:r=${output.fps}:d=${frag.durationSeconds || 0}[${label}]`
            );
            return;
          }

          const inputIdx = frag.inputIndex;
          let filterChain = `[${inputIdx}:v]`;

          // Scale and pad to exact dimensions (required for concat)
          // Using scale with force_original_aspect_ratio and pad to ensure consistent size
          filterChain += `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

          // Apply fade out transition if specified
          if (frag.transitions.out && frag.durationSeconds) {
            const [transType, transDur] = frag.transitions.out.split(/\s+/);
            if (transType === 'fade-to-black' || transType === 'fade-out') {
              const duration = this.parseDuration(transDur);
              const fadeStart = frag.durationSeconds - duration;
              filterChain += `,fade=t=out:st=${fadeStart}:d=${duration}`;
            }
          }

          filterChain += `[${label}]`;
          filters.push(filterChain);
        } else if (!frag.asset) {
          // Generate a black frame for fragments without assets
          filters.push(
            `color=c=black:s=${width}x${height}:r=${output.fps}:d=${frag.durationSeconds || 0}[${label}]`
          );
        }
      });
    });

    // Now compose each sequence
    const sequenceOutputs: string[] = [];
    sequences.forEach((seq) => {
      const seqLabel = `seq${seq.sequenceIndex}`;

      // Sort fragments by z-index (bottom to top) and filter out overlays
      const baseFragments = seq.fragments.filter((f) => f.zIndex === 0);
      const overlayFragments = seq.fragments.filter((f) => f.zIndex > 0);

      // Build base layer by concatenating z-index 0 fragments
      if (baseFragments.length > 0) {
        const baseLabels = baseFragments
          .map((f) => {
            const origIdx = seq.fragments.indexOf(f);
            return `[s${seq.sequenceIndex}f${origIdx}]`;
          })
          .join('');
        filters.push(
          `${baseLabels}concat=n=${baseFragments.length}:v=1:a=0[${seqLabel}_base]`
        );
      }

      // Apply overlays (fragments with z-index > 0)
      let currentLayer = `${seqLabel}_base`;
      overlayFragments.forEach((frag, oIdx) => {
        const origIdx = seq.fragments.indexOf(frag);
        const fragLabel = `s${seq.sequenceIndex}f${origIdx}`;
        const outputLayer =
          oIdx === overlayFragments.length - 1
            ? seqLabel
            : `${seqLabel}_overlay${oIdx}`;

        // Build overlay filter with timing
        // Note: FFmpeg's blend modes require a different approach than simple overlay
        // For now, we'll use overlay and document blend mode as a TODO
        let overlayFilter = `[${currentLayer}][${fragLabel}]overlay=(W-w)/2:0`;

        // Add enable timing for the overlay
        const enableStart = frag.absoluteStart;
        const enableEnd = frag.absoluteEnd;
        overlayFilter += `:enable='between(t,${enableStart},${enableEnd})'`;

        overlayFilter += `[${outputLayer}]`;
        filters.push(overlayFilter);

        // TODO: Blend modes require format conversion and blend filter
        // Example: [bg][fg]format=gbrp,blend=all_mode=screen[out]
        if (frag.blendMode) {
          console.warn(
            `Warning: Blend mode '${frag.blendMode}' requested but not yet implemented`
          );
        }
        currentLayer = outputLayer;
      });

      // If there are no overlays, just rename the base to the sequence output
      if (overlayFragments.length === 0 && baseFragments.length > 0) {
        // The base is already the final output, just rename the reference
        const lastFilter = filters[filters.length - 1];
        filters[filters.length - 1] = lastFilter.replace(
          `[${seqLabel}_base]`,
          `[${seqLabel}]`
        );
      }

      sequenceOutputs.push(`[${seqLabel}]`);
    });

    // If multiple sequences, we need to composite them
    // For now, just use the first sequence
    // TODO: Handle multi-sequence composition

    return filters.join(';\n   ');
  }

  /**
   * Get the input index for an asset
   */
  private getAssetInputIndex(assetName: string): number {
    return this.assetInputMap.get(assetName) ?? -1;
  }

  /**
   * Generate the complete FFmpeg command
   */
  public generate(): string {
    const output = this.outputs[0]; // Use first output for now
    const inputs = this.generateInputs();
    const filterComplex = this.generateFilterComplex();

    const parts: string[] = [
      'ffmpeg',
      '-y', // Overwrite output
      ...inputs,
    ];

    if (filterComplex) {
      parts.push(`-filter_complex "${filterComplex}"`);
      // Map the first sequence as the main video output
      // TODO: Implement multi-sequence composition
      parts.push('-map', '[seq0]');
    }

    // Output settings
    const [width, height] = output.resolution.split('x');
    parts.push(
      '-r',
      output.fps,
      '-s',
      `${width}x${height}`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      output.path
    );

    return parts.join(' \\\n  ');
  }

  /**
   * Generate a readable summary of the project structure
   */
  public generateSummary(): string {
    const sequences = this.buildTimelines();
    const lines: string[] = [];

    lines.push('=== FFmpeg Generation Summary ===\n');

    lines.push(`Assets (${this.assets.size}):`);
    for (const [name, asset] of this.assets) {
      lines.push(`  - ${name}: ${asset.path}`);
    }

    // Check for unresolved durations
    const unresolvedAssets: Array<{ asset: string; path: string }> = [];
    sequences.forEach((seq) => {
      seq.fragments.forEach((frag) => {
        if (frag.duration === '100%' && frag.asset && frag.assetPath) {
          if (
            !unresolvedAssets.find((a) => a.asset === frag.asset)
          ) {
            unresolvedAssets.push({
              asset: frag.asset,
              path: frag.assetPath,
            });
          }
        }
      });
    });

    if (unresolvedAssets.length > 0) {
      lines.push(`\n⚠ Unresolved Durations (100%):`);
      lines.push(
        '  The following assets use 100% duration and need runtime resolution:'
      );
      unresolvedAssets.forEach((a) => {
        lines.push(`  - ${a.asset}: ${a.path}`);
        lines.push(
          `    Resolve with: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${a.path}"`
        );
      });
    }

    lines.push(`\nSequences (${sequences.length}):`);
    sequences.forEach((seq) => {
      const totalDurStr =
        seq.totalDuration > 0
          ? `${seq.totalDuration.toFixed(2)}s`
          : '(needs resolution)';
      lines.push(
        `  Sequence ${seq.sequenceIndex + 1}: ${seq.fragments.length} fragments, total duration: ${totalDurStr}`
      );
      seq.fragments.forEach((frag, fragIdx) => {
        const timeline = `${frag.absoluteStart.toFixed(2)}s → ${frag.absoluteEnd.toFixed(2)}s`;
        const durWarning = frag.duration === '100%' ? ' ⚠' : '';
        lines.push(
          `    ${fragIdx + 1}. [${frag.classes.join(' ')}] ${timeline}${durWarning}`
        );
        lines.push(
          `       asset=${frag.asset || 'none'}, duration=${frag.duration}, z-index=${frag.zIndex}`
        );
        if (frag.marginLeft !== 0 || frag.marginRight !== 0) {
          lines.push(
            `       margins: left=${frag.marginLeft}s, right=${frag.marginRight}s`
          );
        }
        if (frag.transitions.out) {
          lines.push(`       transition-out: ${frag.transitions.out}`);
        }
        if (frag.blendMode) {
          lines.push(`       blend-mode: ${frag.blendMode}`);
        }
      });
    });

    lines.push(`\nOutput: ${this.outputs[0].path}`);
    lines.push(`  Resolution: ${this.outputs[0].resolution}`);
    lines.push(`  FPS: ${this.outputs[0].fps}`);

    return lines.join('\n');
  }
}
