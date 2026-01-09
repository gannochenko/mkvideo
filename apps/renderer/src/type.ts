import { type DefaultTreeAdapterMap } from 'parse5';

export type ASTNode = DefaultTreeAdapterMap['node'];
export type Document = DefaultTreeAdapterMap['document'];
export type Element = DefaultTreeAdapterMap['element'];

export type CSSProperties = {
  [key: string]: string;
};

export type ParsedProject = {
  ast: Document;
  css: Map<Element, CSSProperties>;
  // cssRules: csstree.CssNode;
};

export type Asset = {
  name: string; // e.g. "clip1"
  path: string; // e.g. "./assets/clip1.mp4"
  author?: string; // e.g. "John Doe"
};

export type Fragment = {
  assetName: string;
  assetType: 'video' | 'image' | 'audio';
  duration: number; // calculated, in ms (can come from CSS or from the asset's duration)
  overlayLeft: number; // amount of ms to overlay the fragment on the left
  overlayRight: number; // amount of ms to overlay the fragment on the right
  blendModeLeft: string; // how to blend the left fragment with the current fragment
  blendModeRight: string; // how to blend the right fragment with the current fragment
  transitionIn: string; // how to transition into the fragment
  transitionOut: string; // how to transition out of the fragment
  zIndex: number; // order of layering
};

export type Sequence = {
  fragments: Fragment[];
};

export type Output = {
  name: string; // e.g. "youtube"
  path: string; // e.g. "./output/video.mp4"
  resolution: {
    width: number;
    height: number;
  };
  fps: number; // e.g. 30
};

export type ProjectStructure = {
  sequences: Sequence[];
  assets: Map<string, Asset>;
  output: Output;
};
