import { ProjectStructure, Sequence, Fragment } from './type';
import { StreamDAG } from './dag';
import { StreamUtils } from './stream-builder';

export function generateFilterComplex(project: ProjectStructure): string {
  const dag = buildDAG(project);
  return dag.render();
}

/**
 * Builds the StreamDAG from a project structure
 * Exposed for debugging and analysis
 */
export function buildDAG(project: ProjectStructure): StreamDAG {
  if (project.sequences.length === 0) {
    return new StreamDAG();
  }

  const dag = new StreamDAG();

  // Filter out audio-only sequences (sequences where all assets are audio-only)
  const videoSequences = project.sequences.filter((sequence) => {
    return sequence.fragments.some((fragment) => {
      const asset = project.assets.get(fragment.assetName);
      // Include if asset has video (video or image)
      return asset && (asset.type === 'video' || asset.type === 'image');
    });
  });

  if (videoSequences.length === 0) {
    console.warn('No video sequences found in project');
    return new StreamDAG();
  }

  // Process each video sequence
  const sequenceOutputs: string[] = [];
  for (let seqIdx = 0; seqIdx < videoSequences.length; seqIdx++) {
    const sequence = videoSequences[seqIdx];
    const outputLabel = dag.label();

    const output = generateSequenceGraph(
      dag,
      sequence,
      project.assetIndexMap,
      outputLabel,
    );
    sequenceOutputs.push(output);
  }

  // Connect all sequences with concat
  if (sequenceOutputs.length === 1) {
    // Single sequence, just copy to output
    dag.from(sequenceOutputs[0]).copyTo('outv');
  } else {
    // Multiple sequences, concat them in time
    const streams = sequenceOutputs.map((label) => dag.from(label));
    StreamUtils.concatTo(dag, streams, 'outv');
  }

  return dag;
}

/**
 * Generates filter graph for a single sequence
 */
function generateSequenceGraph(
  dag: StreamDAG,
  sequence: Sequence,
  assetIndexMap: Map<string, number>,
  outputLabel: string,
): string {
  const { fragments } = sequence;

  if (fragments.length === 0) {
    return outputLabel;
  }

  if (fragments.length === 1) {
    // Single fragment, just copy it
    const fragment = fragments[0];
    const inputIndex = assetIndexMap.get(fragment.assetName) ?? 0;
    dag.from(`${inputIndex}:v`).copyTo(outputLabel);
    return outputLabel;
  }

  // Check if we can use simple concat for all (no overlaps anywhere)
  const hasOverlaps = fragments.some((frag) => frag.overlayLeft !== 0);

  if (!hasOverlaps) {
    // Use concat filter for everything (faster)
    buildConcatGraph(dag, fragments, assetIndexMap, outputLabel);
  } else {
    // Mix of overlapping and non-overlapping: use hybrid approach
    buildHybridGraph(dag, fragments, assetIndexMap, outputLabel);
  }

  return outputLabel;
}

/**
 * Builds a graph with a single concat filter for all fragments
 * Adds scale and fps normalization to all inputs
 */
function buildConcatGraph(
  dag: StreamDAG,
  fragments: Fragment[],
  assetIndexMap: Map<string, number>,
  outputLabel: string,
): void {
  const streams = fragments.map((frag) => {
    const inputIndex = assetIndexMap.get(frag.assetName) ?? 0;
    return dag
      .from(`${inputIndex}:v`)
      .scale({ width: 1920, height: 1080 })
      .fps(30);
  });

  StreamUtils.concatTo(dag, streams, outputLabel);
}

/**
 * Builds a hybrid graph: concat for non-overlapping prefix, xfade for the rest
 */
function buildHybridGraph(
  dag: StreamDAG,
  fragments: Fragment[],
  assetIndexMap: Map<string, number>,
  outputLabel: string,
): void {
  // Find the longest prefix of consecutive non-overlapping fragments
  let concatEnd = 0;
  for (let i = 0; i < fragments.length - 1; i++) {
    const hasOverlap = fragments[i + 1].overlayLeft !== 0;
    if (hasOverlap) {
      break;
    }
    concatEnd = i + 1;
  }

  let currentStream;
  let timeOffset = 0;
  let nextFragmentIndex = 0;

  // If we have 2+ non-overlapping fragments at the start, concat them
  if (concatEnd >= 1) {
    const streams = [];
    for (let i = 0; i <= concatEnd; i++) {
      const inputIndex = assetIndexMap.get(fragments[i].assetName) ?? 0;
      streams.push(
        dag
          .from(`${inputIndex}:v`)
          .scale({ width: 1920, height: 1080 })
          .fps(30),
      );
      timeOffset += fragments[i].duration;
    }
    currentStream = StreamUtils.concat(dag, streams);
    nextFragmentIndex = concatEnd + 1;
  } else {
    // Start with first fragment
    const firstInputIndex = assetIndexMap.get(fragments[0].assetName) ?? 0;
    currentStream = dag
      .from(`${firstInputIndex}:v`)
      .scale({ width: 1920, height: 1080 })
      .fps(30);
    timeOffset = fragments[0].duration;
    nextFragmentIndex = 1;
  }

  // Process remaining fragments with xfade
  while (nextFragmentIndex < fragments.length) {
    const currFragment = fragments[nextFragmentIndex];
    const inputIndex = assetIndexMap.get(currFragment.assetName) ?? 0;

    // Scale and normalize FPS before xfade
    const nextStream = dag
      .from(`${inputIndex}:v`)
      .scale({ width: 1920, height: 1080 })
      .fps(30);

    // Adjust offset for overlap
    timeOffset += currFragment.overlayLeft;

    const isLast = nextFragmentIndex === fragments.length - 1;
    const transitionDuration = Math.abs(currFragment.overlayLeft) / 1000;

    if (isLast) {
      // Last fragment - output to final label
      currentStream = currentStream.xfadeTo(nextStream, outputLabel, {
        duration: transitionDuration,
        offset: timeOffset / 1000,
      });
    } else {
      // Intermediate fragment - auto-generate label
      currentStream = currentStream.xfade(nextStream, {
        duration: transitionDuration,
        offset: timeOffset / 1000,
      });
    }

    timeOffset += currFragment.duration;
    nextFragmentIndex++;
  }
}
