import { StreamDAG } from './dag.js';
import {
  makeScale,
  makeFps,
  makeCopy,
  makeConcat,
  makeXFade,
  makeOverlay,
  makeSplit,
  makeGblur,
  makeEq,
  makeDrawtext,
  makeFade,
  makeColorkey,
  makeSetpts,
  makeCrop,
  makeFormat,
} from './filtercomplex.js';

/**
 * StreamBuilder - Fluent API for building filter graphs
 *
 * Usage:
 *   dag.from('0:v')
 *      .scale({ width: 1920, height: 1080 })
 *      .fps(30)
 *      .label();
 */
export class StreamBuilder {
  constructor(
    private dag: StreamDAG,
    private currentLabel: string,
  ) {}

  /**
   * Returns the current stream label
   */
  label(): string {
    return this.currentLabel;
  }

  /**
   * Scale filter
   */
  scale(options: { width: number | string; height: number | string }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeScale(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * FPS normalization filter
   */
  fps(fps: number): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeFps(this.currentLabel, output, fps));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Copy/passthrough filter
   */
  copy(): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeCopy(this.currentLabel, output));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Copy to a specific output label (for final outputs)
   */
  copyTo(outputLabel: string): StreamBuilder {
    this.dag.add(makeCopy(this.currentLabel, outputLabel));
    return new StreamBuilder(this.dag, outputLabel);
  }

  /**
   * Gaussian blur filter
   */
  gblur(sigma: number): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeGblur(this.currentLabel, output, sigma));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Equalization filter
   */
  eq(options: { contrast?: number; brightness?: number }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeEq(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Crop filter
   */
  crop(options: { width: number | string; height: number | string }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeCrop(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Format filter
   */
  format(format: string): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeFormat(this.currentLabel, output, format));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Fade filter
   */
  fade(options: { type: 'in' | 'out'; start?: number; duration: number }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeFade(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Colorkey filter
   */
  colorkey(options: { color: string; similarity: number; blend: number }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeColorkey(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Setpts filter
   */
  setpts(expression: string): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeSetpts(this.currentLabel, output, expression));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Drawtext filter
   */
  drawtext(options: {
    text: string;
    font?: string;
    fontsize?: number;
    fontcolor?: string;
    x?: string;
    y?: string;
    alpha?: string;
  }): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeDrawtext(this.currentLabel, output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * Overlay another stream on top of this one
   */
  overlay(
    otherStream: StreamBuilder,
    options?: { x?: string; y?: string; enable?: string },
  ): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeOverlay(this.currentLabel, otherStream.label(), output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * XFade transition with another stream
   */
  xfade(
    otherStream: StreamBuilder,
    options: { duration: number; offset: number; transition?: string },
  ): StreamBuilder {
    const output = this.dag.label();
    this.dag.add(makeXFade(this.currentLabel, otherStream.label(), output, options));
    return new StreamBuilder(this.dag, output);
  }

  /**
   * XFade transition with another stream, outputting to a specific label
   */
  xfadeTo(
    otherStream: StreamBuilder,
    outputLabel: string,
    options: { duration: number; offset: number; transition?: string },
  ): StreamBuilder {
    this.dag.add(makeXFade(this.currentLabel, otherStream.label(), outputLabel, options));
    return new StreamBuilder(this.dag, outputLabel);
  }

  /**
   * Split this stream into multiple outputs for branching
   */
  split(count: number): MultiStreamBuilder {
    const outputs = Array.from({ length: count }, () => this.dag.label());
    this.dag.add(makeSplit(this.currentLabel, outputs));
    return new MultiStreamBuilder(
      outputs.map((label) => new StreamBuilder(this.dag, label)),
    );
  }
}

/**
 * MultiStreamBuilder - Handles multiple streams from split operations
 */
export class MultiStreamBuilder {
  constructor(private streamBuilders: StreamBuilder[]) {}

  /**
   * Returns all stream builders as an array
   */
  getStreams(): StreamBuilder[] {
    return this.streamBuilders;
  }

  /**
   * Branch processing - applies a function to the streams and returns results
   */
  branch<T>(fn: (streams: StreamBuilder[]) => T): T {
    return fn(this.streamBuilders);
  }
}

/**
 * Static utility for concatenating multiple streams
 */
export class StreamUtils {
  static concat(
    dag: StreamDAG,
    streams: StreamBuilder[],
    outputLabel?: string,
  ): StreamBuilder {
    const output = outputLabel ?? dag.label();
    const inputs = streams.map((s) => s.label());
    dag.add(makeConcat(inputs, output));
    return new StreamBuilder(dag, output);
  }

  static concatTo(
    dag: StreamDAG,
    streams: StreamBuilder[],
    outputLabel: string,
  ): StreamBuilder {
    const inputs = streams.map((s) => s.label());
    dag.add(makeConcat(inputs, outputLabel));
    return new StreamBuilder(dag, outputLabel);
  }
}
