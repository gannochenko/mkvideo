import "./App.css";
import { VideoFrame } from "./components/VideoFrame";
import { useAppParams } from "./hooks/useAppParams";

function Content({
  title = "Central Text",
  date,
  emoji,
}: {
  title?: string;
  date?: string;
  emoji?: string;
}) {
  const titleWords = title.split(" ");

  return (
    <div className="text_alignment">
      <div className="text_outline">
        {titleWords.map((word, i) => (
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
      {emoji && (
        <div className="text_outline text_outline__small">
          <span>{emoji}</span>
        </div>
      )}
    </div>
  );
}

function App() {
  const { title, date, emoji, rendering } = useAppParams();

  if (rendering) {
    document.body.style.background = "transparent";
    return (
      <div className="rendering_container">
        <Content title={title} date={date} emoji={emoji} />
      </div>
    );
  }

  return (
    <VideoFrame>
      <Content title={title} date={date} emoji={emoji} />
    </VideoFrame>
  );
}

export default App;
