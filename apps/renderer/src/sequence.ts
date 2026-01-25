import { AssetManager } from './project';
import { FilterBuffer, Stream } from './stream';
import { Output, SequenceDefinition } from './type';

// type FragmentLayout = {
//   duration: number;
//   trimStart: number;
//   trimEnd: number;
// };

// type Fragment = {
//   assetName: string;
//   duration: string | number;
//   trimStart?: string | number; // padding-left :)
//   layout?: FragmentLayout;
// };

export class Sequence {
  private time: number = 0; // time is absolute

  private videoStream: Stream = null;
  private audioStream: Stream = null;

  constructor(
    private buf: FilterBuffer,
    private definition: SequenceDefinition,
    private output: Output,
    private assetManager: AssetManager,
  ) {}

  build() {}
}
