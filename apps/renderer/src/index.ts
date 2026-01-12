import { parseHTMLFile } from './parser.js';
import { resolve } from 'path';
import { generateFilterComplex } from './generator.js';
import { prepareProject } from './project.js';
import { generateFFmpegCommand } from './ffmpeg.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('Renderer application starting...');

async function main() {
  console.log('Renderer ready');

  // Parse the demo project HTML file
  const projectPath = resolve(__dirname, '../../../examples/demo/project.html');

  const fileContent = await parseHTMLFile(projectPath);
  const project = await prepareProject(fileContent, projectPath);

  console.log('\n=== Filter Complex ===');
  const filterComplex = generateFilterComplex(project);
  console.log(filterComplex);

  console.log('\n=== FFmpeg Command ===');
  const ffmpegCommand = generateFFmpegCommand(project, filterComplex);
  console.log(ffmpegCommand);

  console.log('\n=== Starting Render ===');
  console.log('This may take a while...\n');

  try {
    const { stdout, stderr } = await execAsync(ffmpegCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for ffmpeg output
    });

    if (stderr) {
      console.log('FFmpeg output:');
      console.log(stderr);
    }

    console.log('\n=== Render Complete ===');
    console.log(`Output file: ${project.output.path}`);
  } catch (error: any) {
    console.error('\n=== Render Failed ===');
    console.error('Error:', error.message);
    if (error.stderr) {
      console.error('\nFFmpeg stderr:');
      console.error(error.stderr);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
