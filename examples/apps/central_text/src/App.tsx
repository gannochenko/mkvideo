import "./App.css";
import { VideoFrame } from "./components/VideoFrame";
import { useAppParams } from "./hooks/useAppParams";

function Content({
  title = "Central Text",
  date,
  tags,
}: {
  title?: string;
  date?: string;
  tags?: string;
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
      {tags && (
        <div className="text_outline text_outline__small">
          <span>{tags}</span>
        </div>
      )}
    </div>
  );
}

function App() {
  const { title, date, tags, rendering } = useAppParams();

  if (rendering) {
    document.body.style.background = "transparent";
    return (
      <div className="rendering_container">
        <Content title={title} date={date} tags={tags} />
      </div>
    );
  }

  return (
    <VideoFrame initialContent={{ title, date, tags }}>
      {(content) => <Content {...content} />}
    </VideoFrame>
  );
}

export default App;
