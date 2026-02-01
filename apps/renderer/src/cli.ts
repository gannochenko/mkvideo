#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { HTMLParser } from './html-parser.js';
import { HTMLProjectParser } from './html-project-parser.js';
import { makeFFmpegCommand, runFFMpeg } from './ffmpeg.js';
import { getAssetDuration } from './ffprobe.js';

const program = new Command();

program
  .name('staticvid')
  .description('CLI tool for rendering video projects')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate video output from a project')
  .option('-p, --project <path>', 'Path to project directory', '.')
  .option('-o, --output <name>', 'Output name to render (renders all if not specified)')
  .option('-d, --dev', 'Use fast encoding preset for development (ultrafast)')
  .action(async (options) => {
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
      console.log(`📄 Loading: ${projectFilePath}\n`);

      // Parse the project HTML file
      const parser = new HTMLProjectParser(
        await new HTMLParser().parseFile(projectFilePath),
        projectFilePath,
      );
      const project = await parser.parse();

      // Determine which outputs to render
      const allOutputs = Array.from(project.getOutputs().keys());
      const outputsToRender = options.output ? [options.output] : allOutputs;

      if (outputsToRender.length === 0) {
        console.error('Error: No outputs defined in project.html');
        process.exit(1);
      }

      // Validate requested output exists
      if (options.output && !allOutputs.includes(options.output)) {
        console.error(`Error: Output "${options.output}" not found in project.html`);
        console.error(`Available outputs: ${allOutputs.join(', ')}`);
        process.exit(1);
      }

      // Determine encoding preset based on -d flag
      const preset = options.dev ? 'ultrafast' : 'medium';
      console.log(`⚡ Encoding preset: ${preset}`);
      console.log(`🎬 Rendering outputs: ${outputsToRender.join(', ')}\n`);

      // Render each output
      for (const outputName of outputsToRender) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📹 Rendering: ${outputName}`);
        console.log(`${'='.repeat(60)}\n`);

        // Render containers for this output
        await project.renderContainers(outputName);

        // Print project statistics
        project.printStats();

        // Build filter graph
        const filterBuf = await project.build(outputName);
        const filter = filterBuf.render();

        console.log('\n=== Filter Graph ===\n');
        console.log(filter);

        // Generate FFmpeg command with appropriate preset
        const ffmpegCommand = makeFFmpegCommand(project, filter, outputName, preset);

        console.log('\n=== Starting Render ===\n');

        // Run FFmpeg
        await runFFMpeg(ffmpegCommand);

        // Get output info
        const output = project.getOutput(outputName);
        if (!output) {
          throw new Error(`Output "${outputName}" not found`);
        }

        const resultPath = output.path;
        console.log(`\n✅ Output file: ${resultPath}`);

        const resultDuration = await getAssetDuration(resultPath);
        console.log(`⏱️  Duration: ${resultDuration}ms`);
      }

      console.log('\n🎉 All outputs rendered successfully!\n');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('upload')
  .description('Upload video to platforms (not yet implemented)')
  .option('-p, --project <path>', 'Path to project directory', '.')
  .option('-u, --upload <platform>', 'Platform to upload to (e.g., youtube)')
  .action(() => {
    console.log('Upload command is not yet implemented.');
    console.log('This feature will allow uploading videos to platforms like YouTube.');
    process.exit(0);
  });

program.parse(process.argv);
