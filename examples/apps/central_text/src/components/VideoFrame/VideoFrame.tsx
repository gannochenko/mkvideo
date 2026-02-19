import { type ReactNode, useEffect, useRef, useState } from "react";
import { FormatPanel, FORMATS, type Format } from "../FormatPanel";
import styles from "./VideoFrame.module.css";

interface VideoFrameProps {
  children?: ReactNode;
}

export function VideoFrame({ children }: VideoFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<Format>(FORMATS[1]); // default: YT Shorts
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width: cw, height: ch } = entry.contentRect;
      setScale(Math.min(cw / format.width, ch / format.height));
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [format.width, format.height]);

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        className={styles.frame}
        style={{
          width: `${format.width}px`,
          height: `${format.height}px`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
      <FormatPanel selected={format} onSelect={setFormat} />
    </div>
  );
}
