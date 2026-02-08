import { Command } from 'commander';
import { resolve, join, relative } from 'path';
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'fs';

export function registerAddAssetsCommand(
  program: Command,
  handleError: (error: any, operation: string) => void,
): void {
  program
    .command('add-assets')
    .description('Scan for media files and add them as assets to project.html')
    .option('-p, --project <path>', 'Path to project directory', '.')
    .action((options) => {
      try {
        // Resolve project path
        const projectPath = resolve(process.cwd(), options.project);
        const projectFilePath = resolve(projectPath, 'project.html');

        // Validate project.html exists
        if (!existsSync(projectFilePath)) {
          console.error(`Error: project.html not found in ${projectPath}`);
          process.exit(1);
        }

        console.log(`📁 Project: ${projectPath}`);
        console.log(`📄 Scanning for media files...\n`);

        // Find all media files recursively
        const mediaFiles: {
          path: string;
          relativePath: string;
          type: 'video' | 'audio' | 'image';
        }[] = [];

        const scanDirectory = (dir: string) => {
          const entries = readdirSync(dir);

          for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
              scanDirectory(fullPath);
            } else {
              const ext = entry.toLowerCase().split('.').pop();
              let type: 'video' | 'audio' | 'image' | null = null;

              if (ext === 'mp4') {
                type = 'video';
              } else if (ext === 'mp3') {
                type = 'audio';
              } else if (ext === 'jpg' || ext === 'png') {
                type = 'image';
              }

              if (type) {
                const relativePath = relative(projectPath, fullPath);
                mediaFiles.push({ path: fullPath, relativePath, type });
              }
            }
          }
        };

        scanDirectory(projectPath);

        // Sort by relative path (name)
        mediaFiles.sort((a, b) =>
          a.relativePath.localeCompare(b.relativePath),
        );

        // Group by type and assign names
        const videos = mediaFiles.filter((f) => f.type === 'video');
        const audios = mediaFiles.filter((f) => f.type === 'audio');
        const images = mediaFiles.filter((f) => f.type === 'image');

        console.log(
          `Found ${videos.length} video(s), ${audios.length} audio(s), ${images.length} image(s)\n`,
        );

        if (mediaFiles.length === 0) {
          console.log('No media files found.');
          process.exit(0);
        }

        // Generate asset tags
        const assetTags: string[] = [];

        videos.forEach((file, index) => {
          const name = `clip_${index + 1}`;
          assetTags.push(
            `  <asset data-name="${name}" data-path="./${file.relativePath}" />`,
          );
          console.log(`${name}: ${file.relativePath}`);
        });

        audios.forEach((file, index) => {
          const name = `track_${index + 1}`;
          assetTags.push(
            `  <asset data-name="${name}" data-path="./${file.relativePath}" />`,
          );
          console.log(`${name}: ${file.relativePath}`);
        });

        images.forEach((file, index) => {
          const name = `image_${index + 1}`;
          assetTags.push(
            `  <asset data-name="${name}" data-path="./${file.relativePath}" />`,
          );
          console.log(`${name}: ${file.relativePath}`);
        });

        // Read project.html
        let content = readFileSync(projectFilePath, 'utf-8');

        // Check if <assets> section exists
        const assetsMatch = content.match(/<assets>([\s\S]*?)<\/assets>/);

        if (assetsMatch) {
          // Replace existing assets section
          const newAssetsSection = `<assets>\n${assetTags.join('\n')}\n</assets>`;
          content = content.replace(
            /<assets>[\s\S]*?<\/assets>/,
            newAssetsSection,
          );
        } else {
          // Add assets section before </project> or at the end
          const newAssetsSection = `\n<assets>\n${assetTags.join('\n')}\n</assets>\n`;

          if (content.includes('</outputs>')) {
            content = content.replace(
              '</outputs>',
              `</outputs>${newAssetsSection}`,
            );
          } else if (content.includes('</style>')) {
            content = content.replace(
              '</style>',
              `</style>${newAssetsSection}`,
            );
          } else {
            content += newAssetsSection;
          }
        }

        // Write back to project.html
        writeFileSync(projectFilePath, content, 'utf-8');

        console.log(`\n✅ Assets added to ${projectFilePath}`);
      } catch (error) {
        handleError(error, 'Asset scanning');
        process.exit(1);
      }
    });
}
