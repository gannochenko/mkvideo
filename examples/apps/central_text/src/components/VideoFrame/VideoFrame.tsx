import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./VideoFrame.module.css";

interface VideoFrameProps {
  children?: ReactNode;
  width?: number;
  height?: number;
}

export function VideoFrame({
  children,
  width = 1080,
  height = 1920,
}: VideoFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width: cw, height: ch } = entry.contentRect;
      setScale(Math.min(cw / width, ch / height));
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        className={styles.frame}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
