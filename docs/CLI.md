The tool will be called "staticvid"

The CLI interface has the following commands:

# Generate

staticvid generate -p path-to-project/ -o youtube -d

This command looks into the folder specified by the parameter -p. If the parameter is not set - try the current folder.
Check if in that folder the project.html file exists. If not, return an error.

Then it renders a video for the selected output (option -o). If no output specified, it renders for all outputs listed in the file.

If -d is specified, the preset of ffmpeg is set to "ultrafast", otherwise it is "medium".

If the output folder does not exist, create it.

# Bootstrap

staticvid bootstrap -n "project-name"

Will create a folder with the provided project name, and copy the contents of the template folder there.

# Adding assets

staticvid add-assets -p path-to-project/

Will search for any mp3, mp4, jpg, png files in the project folder (current project if not specified), then the findings should be sorted by name asc, and added relative paths to the files as assets to the project.html file. The 'data-name' attribute is chosen numerically, as per the sorting order: clip_N for video, track_N for audio, image_N for images.

# Upload

staticvid upload -p path-to-project/ -u youtube

This is yet to be implemented. There is going to be an upload section in the project.html file.
