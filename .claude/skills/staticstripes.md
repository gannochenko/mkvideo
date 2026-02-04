# StaticStripes Video Generation Skill

You are an expert at using **StaticStripes**, a declarative HTML-based video rendering tool powered by FFmpeg.

## What is StaticStripes?

StaticStripes is a CLI tool that generates videos from HTML/CSS project definitions. It allows you to:
- Define video sequences using HTML syntax
- Style video elements with CSS
- Apply filters, transitions, and effects
- Generate multiple output formats from a single project
- Use hardware acceleration for faster rendering

## System Requirements

- **Node.js 22+** (required)
- **FFmpeg** installed and in system PATH
- **npm 10+**

## Installation

```bash
# Global installation
npm install -g @gannochenko/staticstripes

# Verify installation
staticstripes --version
```

## Core Commands

### 1. Bootstrap - Create New Project

```bash
staticstripes bootstrap -n <project-name>
```

Creates a new video project from template.

**Example:**
```bash
staticstripes bootstrap -n my-video
cd my-video
```

### 2. Add Assets - Scan Media Files

```bash
staticstripes add-assets -p <project-path>
```

Scans for video, audio, and image files and adds them to project.html.

**Supported formats:**
- Video: `.mp4`
- Audio: `.mp3`
- Images: `.jpg`, `.png`

**Example:**
```bash
# Add all media files in current project
staticstripes add-assets -p .
```

### 3. Generate - Render Video

```bash
staticstripes generate [options]
```

**Options:**
- `-p, --project <path>` - Project directory (default: current)
- `-o, --output <name>` - Specific output to render (default: all)
- `-d, --dev` - Development mode (ultrafast encoding)
- `--debug` - Show debug information (FFmpeg command, stack traces)

**Examples:**
```bash
# Render all outputs in production quality
staticstripes generate -p .

# Render specific output in dev mode (fast)
staticstripes generate -p . -o youtube -d

# Debug mode with full details
staticstripes generate -p . -o youtube --debug
```

## Project Structure

```
my-video-project/
├── project.html          # Main project file (HTML-based definition)
├── input/                # Video clips
├── audio/                # Audio tracks
├── images/               # Image assets
├── effects/              # Effect clips
├── output/               # Generated videos
└── .cache/               # Temporary rendering cache
```

## Project File Format (project.html)

### Basic Structure

```html
<style>
  /* CSS for styling video elements */
  .video-fragment {
    -offset-start: 0s;
    -offset-end: 5s;
  }
</style>

<outputs>
  <output
    data-name="youtube"
    data-path="./output/youtube.mp4"
    data-fps="30"
    data-resolution="1920x1080"
  />
</outputs>

<assets>
  <asset data-name="clip_1" data-path="./input/video1.mp4" />
  <asset data-name="track_1" data-path="./audio/music.mp3" />
</assets>

<sequence id="main">
  <fragment data-asset="clip_1" class="video-fragment" />
</sequence>
```

### Key CSS Properties

**Timing:**
- `-offset-start: <time>` - Start time (e.g., `0s`, `1500ms`)
- `-offset-end: <time>` - End time
- Can use `calc()` expressions: `calc(prev_fragment.end + 500ms)`

**Object Fit:**
- `-object-fit: cover` - Fill frame (crop to fit)
- `-object-fit: contain` - Fit inside frame (letterbox)
- `-object-fit: contain ambient <blur> <brightness> <saturation>` - Ambient background

**Transitions:**
- `-transition-start: <name> <duration>` - Fade in effect
- `-transition-end: <name> <duration>` - Fade out effect
- Examples: `fade-in 1s`, `fade-out 500ms`

**Filters:**
- `filter: blur(<px>)` - Blur effect
- `-chromakey: <color> <similarity> <blend>` - Green screen

**Overlay:**
- `-overlay-start-z-index: <number>` - Layer order at start
- `-overlay-end-z-index: <number>` - Layer order at end

## Common Workflows

### Workflow 1: Create New Video Project

```bash
# 1. Create project
staticstripes bootstrap -n holiday-video
cd holiday-video

# 2. Add your media files to input/, audio/, images/

# 3. Scan and add assets
staticstripes add-assets -p .

# 4. Edit project.html to arrange clips

# 5. Preview in dev mode (fast)
staticstripes generate -p . -o youtube -d

# 6. Final render (high quality)
staticstripes generate -p . -o youtube
```

### Workflow 2: Debug Issues

```bash
# Run with debug flag to see:
# - Full FFmpeg command
# - Stack traces
# - Error details
staticstripes generate -p . -o youtube --debug
```

### Workflow 3: Multiple Output Formats

```html
<outputs>
  <output data-name="youtube" data-path="./output/youtube.mp4" data-fps="30" data-resolution="1920x1080" />
  <output data-name="instagram" data-path="./output/instagram.mp4" data-fps="30" data-resolution="1080x1920" />
  <output data-name="tiktok" data-path="./output/tiktok.mp4" data-fps="30" data-resolution="1080x1920" />
</outputs>
```

```bash
# Render all formats
staticstripes generate -p .

# Or render specific format
staticstripes generate -p . -o instagram
```

## Error Handling

StaticStripes provides clear error messages:

**Normal mode:**
```
❌ Video generation failed

Error: Asset file(s) not found:
  - /path/to/missing/video.mp4

Please check that all asset paths in project.html are correct.

💡 Tip: Run with --debug flag for detailed error information
```

**Debug mode:**
```
🐛 Debug mode enabled

❌ Video generation failed

Error: Asset file(s) not found:
  - /path/to/missing/video.mp4

=== Debug Information ===

Full error object: Error: Asset file(s) not found...
Stack trace:
Error: Asset file(s) not found...
    at HTMLProjectParser.validateAssetFiles (...)
    [full stack trace]

=== FFmpeg Command ===
ffmpeg -y -i "/path/to/input.mp4" -filter_complex "..." -map "[outv]" ...
```

## Example: Simple Video Project

```html
<style>
  .clip {
    -offset-start: 0s;
    -offset-end: 5s;
    -transition-start: fade-in 1s;
    -transition-end: fade-out 1s;
    -object-fit: cover;
  }

  .background-music {
    /* Audio track plays throughout */
  }
</style>

<outputs>
  <output
    data-name="youtube"
    data-path="./output/final.mp4"
    data-fps="30"
    data-resolution="1920x1080"
  />
</outputs>

<assets>
  <asset data-name="intro_clip" data-path="./input/intro.mp4" />
  <asset data-name="main_clip" data-path="./input/main.mp4" />
  <asset data-name="outro_clip" data-path="./input/outro.mp4" />
  <asset data-name="music" data-path="./audio/background.mp3" />
</assets>

<sequence id="main">
  <fragment data-asset="intro_clip" class="clip" />
  <fragment data-asset="main_clip" class="clip" style="-offset-start: 5s; -offset-end: 15s;" />
  <fragment data-asset="outro_clip" class="clip" style="-offset-start: 15s; -offset-end: 20s;" />
  <fragment data-asset="music" class="background-music" />
</sequence>
```

## Advanced Features

### Calc() Expressions

Reference other fragments in timing calculations:

```css
.second-clip {
  -offset-start: calc(first_clip.end + 500ms);
  -offset-end: calc(first_clip.end + 5500ms);
}
```

### Container Overlays

Render HTML/CSS as PNG overlays:

```html
<container id="title_card">
  <div style="font-size: 72px; color: white;">
    My Video Title
  </div>
</container>

<fragment data-container="title_card" style="-offset-start: 0s; -offset-end: 3s;" />
```

### Chromakey (Green Screen)

```css
.greenscreen {
  -chromakey: #00ff00 0.3 0.1;
}
```

## Troubleshooting

### FFmpeg Not Found

```
❌ Getting dimensions failed

Error: FFmpeg not found in system PATH.
```

**Solution:** Install FFmpeg:
- **macOS:** `brew install ffmpeg`
- **Ubuntu/Debian:** `sudo apt-get install ffmpeg`
- **Windows:** Download from https://ffmpeg.org/download.html

### Node Version Too Old

```
npm error engine Not compatible with your version of node/npm
npm error notsup Required: {"node":">=22.0.0"}
```

**Solution:** Upgrade to Node.js 22+

### Assets Not Found

```
❌ Video generation failed

Error: Asset file(s) not found:
  - /path/to/video.mp4
```

**Solution:**
1. Check file paths in `project.html`
2. Verify files exist in specified locations
3. Use relative paths from project root

## Best Practices

1. **Use dev mode for iteration**
   ```bash
   staticstripes generate -p . -o youtube -d
   ```
   Much faster, great for testing layouts

2. **Always validate assets first**
   ```bash
   staticstripes add-assets -p .
   ```

3. **Use debug mode for troubleshooting**
   ```bash
   staticstripes generate -p . --debug
   ```

4. **Organize assets by type**
   - Keep videos in `input/`
   - Keep audio in `audio/`
   - Keep images in `images/`

5. **Use calc() for dynamic timing**
   ```css
   -offset-start: calc(prev.end + 500ms);
   ```

## Platform Support

- ✅ **Windows** 10/11 (use npm scripts, not Makefile)
- ✅ **macOS** 10.15+
- ✅ **Linux** (Ubuntu, Debian, Fedora, etc.)

## When to Use StaticStripes

**Good for:**
- Automated video generation from templates
- Batch processing multiple videos
- Programmatic video creation
- CI/CD video generation

**Not ideal for:**
- Complex animations (use motion graphics tools)
- Real-time video editing (use video editors)
- Interactive video (use video players with JS)

## Resources

- GitHub: https://github.com/[repo-url]
- Documentation: See README.md in project root
- Report issues: GitHub Issues

---

When helping users with StaticStripes:
1. Always check FFmpeg is installed first
2. Use `--debug` flag to diagnose issues
3. Validate project.html syntax
4. Check asset file paths are correct
5. Start with dev mode (`-d`) for faster iteration
