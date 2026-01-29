import { Asset, Output, SequenceDefinition } from './type';
import { Label } from './ffmpeg';
import { AssetManager } from './asset-manager';

export class Project {
  private assetManager: AssetManager;

  constructor(
    private sequences: SequenceDefinition[],
    assets: Asset[],
    private output: Output,
  ) {
    this.assetManager = new AssetManager(assets);
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  public getSequences(): SequenceDefinition[] {
    return this.sequences;
  }

  public getOutput(): Output {
    return this.output;
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
