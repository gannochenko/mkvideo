import { useEffect } from "react";
import "./App.css";
import { VideoFrame } from "./components/VideoFrame";
import { useAppParams } from "./hooks/useAppParams";

function Content({
  title = "Central Text",
  date,
  tags,
  extra,
}: {
  title?: string;
  date?: string;
  tags?: string;
  extra?: string;
}) {
  return (
    <div className="text_alignment">
      <div className="text_outline">
        {title.split(" ").map((word, i) => (
          <span key={i}>{word}</span>
        ))}
      </div>
      {date && (
        <div className="text_outline text_outline__small">
          {date.split(" ").map((part, i) => (
            <span key={i}>{part}</span>
          ))}
        </div>
      )}
      {extra && (
        <div className="text_outline text_outline__small">
          <span>
            <span>{extra}</span>
          </span>
        </div>
      )}
      {tags && (
        <div className="text_outline text_outline__small">
          {tags.split(" ").map((part, i) => {
            return <span key={i}>#{part.trim().replace(/,/g, "")}</span>;
          })}
        </div>
      )}
    </div>
  );
}

function RenderingView({
  title, date, tags, extra,
}: { title?: string; date?: string; tags?: string; extra?: string }) {
  useEffect(() => {
    document.body.style.background = "transparent";
    (window as unknown as Record<string, unknown>)["__stsRenderComplete"] = true;
  }, []);

  return (
    <div className="rendering_container">
      <Content title={title} date={date} tags={tags} extra={extra} />
    </div>
  );
}

function App() {
  const { title, date, tags, extra, rendering } = useAppParams();

  if (rendering) {
    return <RenderingView title={title} date={date} tags={tags} extra={extra} />;
  }

  return (
    <VideoFrame initialContent={{ title, date, tags, extra }}>
      {(content) => <Content {...content} />}
    </VideoFrame>
  );
}

export default App;
