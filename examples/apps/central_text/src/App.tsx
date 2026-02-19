import { useState } from "react";
import "./App.css";
import { VideoFrame } from "./components/VideoFrame";
import { FormatPanel, FORMATS, type Format } from "./components/FormatPanel";

function App() {
  const [format, setFormat] = useState<Format>(FORMATS[1]); // default: YT Shorts

  return (
    <>
      <VideoFrame width={format.width} height={format.height}>
        <div className="text_alignment">
          <div className="text_outline">
            <span>Christmas</span> <span>Morning</span> <span>in</span>
            <span>Liberec</span>
          </div>
          <div className="text_outline text_outline__small">
            <span>Dec</span> <span>24</span> <span>2025</span>
          </div>
          <div className="text_outline text_outline__small">
            <span>❄️ 🏔️ 🌨️</span>
          </div>
        </div>
      </VideoFrame>
      <FormatPanel selected={format} onSelect={setFormat} />
    </>
  );
}

export default App;
