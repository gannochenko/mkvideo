The tool will be called "staticvid"

The CLI interface has the following commands:

# Generate

staticvid generate -p path-to-project/ -o youtube -d

This command looks into the folder specified by the parameter -p. If the parameter is not set - try the current folder.
Check if in that folder the project.html file exists. If not, return an error.

Then it renders a video for the selected output (option -o). If no output specified, it renders for all outputs listed in the file.

If -d is specified, the preset of ffmpeg is set to "ultrafast", otherwise it is "medium".

# Upload

staticvid upload -p path-to-project/ -u youtube

This is yet to be implemented. There is going to be an upload section in the project.html file.
