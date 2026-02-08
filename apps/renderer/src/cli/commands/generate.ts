import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HTMLParser } from '../../html-parser.js';
import { HTMLProjectParser } from '../../html-project-parser.js';
import {
  makeFFmpegCommand,
  runFFMpeg,
  checkFFmpegInstalled,
} from '../../ffmpeg.js';
import { getAssetDuration } from '../../ffprobe.js';
import { cleanupStaleCache } from '../../container-renderer.js';

export function registerGenerateCommand(
  program: Command,
  isDebugMode: () => boolean,
  handleError: (error: any, operation: string) => void,
): void {
  program
    .command('generate')
    .description('Generate video output from a project')
    .option('-p, --project <path>', 'Path to project directory', '.')
    .option(
      '-o, --output <name>',
      'Output name to render (renders all if not specified)',
    )
    .option(
      '--option <name>',
      'FFmpeg option preset to use (from project.html <ffmpeg> section)',
    )
    .action(async (options) => {
      try {
        // Check if FFmpeg is installed
        console.log('🔍 Checking for FFmpeg...');
        await checkFFmpegInstalled();
        console.log('✅ FFmpeg found\n');

        // Resolve project path
        const projectPath = resolve(process.cwd(), options.project);
        const projectFilePath = resolve(projectPath, 'project.html');

        // Validate project.html exists
        if (!existsSync(projectFilePath)) {
          console.error(`Error: project.html not found in ${projectPath}`);
          process.exit(1);
        }

        console.log(`📁 Project: ${projectPath}`);
        console.log(`📄 Loading: ${projectFilePath}\n`);

        // Parse the project HTML file once to get output names
        const initialParser = new HTMLProjectParser(
          await new HTMLParser().parseFile(projectFilePath),
          projectFilePath,
        );
        const initialProject = await initialParser.parse();

        // Determine which outputs to render
        const allOutputs = Array.from(initialProject.getOutputs().keys());
        const outputsToRender = options.output ? [options.output] : allOutputs;

        if (outputsToRender.length === 0) {
          console.error('Error: No outputs defined in project.html');
          process.exit(1);
        }

        // Validate requested output exists
        if (options.output && !allOutputs.includes(options.output)) {
          console.error(
            `Error: Output "${options.output}" not found in project.html`,
          );
          console.error(`Available outputs: ${allOutputs.join(', ')}`);
          process.exit(1);
        }

        // Log which outputs will be rendered
        console.log(`🎬 Rendering outputs: ${outputsToRender.join(', ')}\n`);

        // Create a shared cache key store for all outputs
        const activeCacheKeys = new Set<string>();

        // Render each output
        for (const outputName of outputsToRender) {
          // Re-parse the project for each output to ensure clean state
          const parser = new HTMLProjectParser(
            await new HTMLParser().parseFile(projectFilePath),
            projectFilePath,
          );
          const project = await parser.parse();

          console.log(`\n${'='.repeat(60)}`);
          console.log(`📹 Rendering: ${outputName}`);
          console.log(`${'='.repeat(60)}\n`);

          // Get output info and ensure output directory exists
          const output = project.getOutput(outputName);
          if (!output) {
            throw new Error(`Output "${outputName}" not found`);
          }

          const outputDir = dirname(output.path);
          if (!existsSync(outputDir)) {
            console.log(`📂 Creating output directory: ${outputDir}`);
            mkdirSync(outputDir, { recursive: true });
          }

          // Render containers for this output (accumulate cache keys)
          await project.renderContainers(outputName, activeCacheKeys);

          // Print project statistics
          project.printStats();

          // Build filter graph
          const filterBuf = await project.build(outputName);
          const filter = filterBuf.render();

          // Determine FFmpeg arguments to use
          let ffmpegArgs: string;
          const defaultArgs =
            '-pix_fmt yuv420p -preset medium -c:a aac -b:a 192k';

          if (options.option) {
            // User specified an option name, look it up in project
            const ffmpegOption = project.getFfmpegOption(options.option);
            if (!ffmpegOption) {
              const availableOptions = Array.from(
                project.getFfmpegOptions().keys(),
              );
              console.error(
                `Error: FFmpeg option "${options.option}" not found in project.html`,
              );
              if (availableOptions.length > 0) {
                console.error(
                  `Available options: ${availableOptions.join(', ')}`,
                );
              } else {
                console.error(
                  'No FFmpeg options defined in project.html <ffmpeg> section',
                );
              }
              process.exit(1);
            }
            ffmpegArgs = ffmpegOption.args;
            console.log(`⚡ Using FFmpeg option: ${options.option}`);
          } else {
            // No option specified, use default
            ffmpegArgs = defaultArgs;
            console.log(`⚡ Using default FFmpeg arguments`);
          }

          // Generate FFmpeg command
          const ffmpegCommand = makeFFmpegCommand(
            project,
            filter,
            outputName,
            ffmpegArgs,
          );

          if (isDebugMode()) {
            console.log('\n=== FFmpeg Command ===\n');
            console.log(ffmpegCommand);
            console.log('\n======================\n');
          }

          console.log('\n=== Starting Render ===\n');

          // Run FFmpeg
          await runFFMpeg(ffmpegCommand);

          const resultPath = output.path;
          console.log(`\n✅ Output file: ${resultPath}`);

          const resultDuration = await getAssetDuration(resultPath);
          console.log(`⏱️  Duration: ${resultDuration}ms`);
        }

        // Clean up stale cache entries after all outputs are rendered
        if (activeCacheKeys.size > 0) {
          console.log('\n=== Cleaning up stale cache ===\n');
          await cleanupStaleCache(projectPath, activeCacheKeys);
        }

        console.log('\n🎉 All outputs rendered successfully!\n');
      } catch (error) {
        handleError(error, 'Video generation');
        process.exit(1);
      }
    });
}
