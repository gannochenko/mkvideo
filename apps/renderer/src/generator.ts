import { ProjectStructure, Sequence, Fragment } from './type';
import {
  FilterGraph,
  makeConcat,
  makeXFade,
  makeCopy,
  renderFilterGraph,
} from './ffmpeg';

export function generateFilterComplex(project: ProjectStructure): string {
  // For now, process only the first sequence
  if (project.sequences.length === 0) {
    return '';
  }

  const sequence = project.sequences[0];
  const graph = generateSequenceGraph(sequence);

  return renderFilterGraph(graph);
}

/**
 * Generates filter graph for a single sequence
 */
function generateSequenceGraph(sequence: Sequence): FilterGraph {
  const { fragments } = sequence;

  if (fragments.length === 0) {
    return [];
  }

  if (fragments.length === 1) {
    // Single fragment, just output it
    return [makeCopy('0:v', 'outv')];
  }

  // Check if we can use simple concat for all (no overlaps anywhere)
  const hasOverlaps = fragments.some((frag) => frag.overlayLeft !== 0);

  if (!hasOverlaps) {
    // Use concat filter for everything (faster)
    return buildConcatGraph(fragments);
  }

  // Mix of overlapping and non-overlapping: use hybrid approach
  return buildHybridGraph(fragments);
}

/**
 * Builds a graph with a single concat filter for all fragments
 */
function buildConcatGraph(fragments: Fragment[]): FilterGraph {
  const inputs = fragments.map((_, idx) => `${idx}:v`);
  return [makeConcat(inputs, 'outv')];
}

/**
 * Builds a hybrid graph: concat for non-overlapping prefix, xfade for the rest
 */
function buildHybridGraph(fragments: Fragment[]): FilterGraph {
  const graph: FilterGraph = [];

  // Find the longest prefix of consecutive non-overlapping fragments
  let concatEnd = 0;
  for (let i = 0; i < fragments.length - 1; i++) {
    const hasOverlap = fragments[i + 1].overlayLeft !== 0;
    if (hasOverlap) {
      break;
    }
    concatEnd = i + 1;
  }

  let currentLabel = '';
  let timeOffset = 0;
  let nextFragmentIndex = 0;

  // If we have 2+ non-overlapping fragments at the start, concat them
  if (concatEnd >= 1) {
    const inputs = [];
    for (let i = 0; i <= concatEnd; i++) {
      inputs.push(`${i}:v`);
      timeOffset += fragments[i].duration;
    }
    currentLabel = 'g0';
    graph.push(makeConcat(inputs, currentLabel));
    nextFragmentIndex = concatEnd + 1;
  } else {
    // Start with first fragment
    currentLabel = '0:v';
    timeOffset = fragments[0].duration;
    nextFragmentIndex = 1;
  }

  // Process remaining fragments with xfade
  while (nextFragmentIndex < fragments.length) {
    const currFragment = fragments[nextFragmentIndex];

    // Adjust offset for overlap (now only overlayLeft matters)
    timeOffset += currFragment.overlayLeft;

    const nextLabel =
      nextFragmentIndex === fragments.length - 1
        ? 'outv'
        : `x${nextFragmentIndex - 1}`;
    const transitionDuration = Math.abs(currFragment.overlayLeft) / 1000;

    graph.push(
      makeXFade(currentLabel, `${nextFragmentIndex}:v`, nextLabel, {
        duration: transitionDuration,
        offset: timeOffset / 1000,
      }),
    );

    currentLabel = nextLabel;
    timeOffset += currFragment.duration;
    nextFragmentIndex++;
  }

  return graph;
}
