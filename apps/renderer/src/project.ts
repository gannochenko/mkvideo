import { Asset, Output, SequenceDefinition } from './type';
import { Label } from './ffmpeg';
import { AssetManager } from './asset-manager';
import { Sequence } from './sequence';
import { FilterBuffer } from './stream';
import { ExpressionContext, FragmentData } from './expression-parser';

export class Project {
  private assetManager: AssetManager;
  private expressionContext: ExpressionContext;

  constructor(
    private sequencesDefinitions: SequenceDefinition[],
    assets: Asset[],
    private outputs: Map<string, Output>,
    private cssText: string,
  ) {
    this.assetManager = new AssetManager(assets);
    this.expressionContext = {
      fragments: new Map<string, FragmentData>(),
    };
  }

  public build(outputName: string): FilterBuffer {
    const output = this.getOutput(outputName);
    if (!output) {
      throw new Error(`Output "${outputName}" not found`);
    }

    let buf = new FilterBuffer();
    let mainSequence: Sequence | null = null;

    this.sequencesDefinitions.forEach((sequenceDefinition) => {
      const seq = new Sequence(
        buf,
        sequenceDefinition,
        output,
        this.getAssetManager(),
        this.expressionContext,
      );
      if (seq.isEmpty()) {
        return;
      }

      seq.build();

      if (!mainSequence) {
        mainSequence = seq;
      } else {
        mainSequence.overlayWith(seq);
      }
    });

    if (mainSequence) {
      const sequence: Sequence = mainSequence;
      sequence.getVideoStream().endTo({
        tag: 'outv',
        isAudio: false,
      });
      sequence.getAudioStream().endTo({
        tag: 'outa',
        isAudio: true,
      });
    }

    return buf;
  }

  public printStats() {
    this.assetManager.getAssetIndexMap().forEach((_index, assetName) => {
      const asset = this.assetManager.getAssetByName(assetName)!;

      console.log(
        `Asset "${asset.name}" (${asset.type}) dimensions: w=${asset.width}, h=${asset.height}, rotation: ${asset.rotation}°, duration: ${asset.duration}, hasVideo: ${asset.hasVideo}, hasAudio: ${asset.hasAudio}`,
      );
    });
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  public getOutput(outputName: string): Output | undefined {
    return this.outputs.get(outputName);
  }

  public getCssText(): string {
    return this.cssText;
  }

  public getSequenceDefinitions(): SequenceDefinition[] {
    return this.sequencesDefinitions;
  }

  // Delegation methods for convenience
  public getAssetIndexMap(): Map<string, number> {
    return this.assetManager.getAssetIndexMap();
  }

  public getAssetByName(name: string): Asset | undefined {
    return this.assetManager.getAssetByName(name);
  }

  public getVideoInputLabelByAssetName(name: string): Label {
    return this.assetManager.getVideoInputLabelByAssetName(name);
  }

  public getAudioInputLabelByAssetName(name: string): Label {
    return this.assetManager.getAudioInputLabelByAssetName(name);
  }
}
