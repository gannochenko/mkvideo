import { parseHTMLFile } from './parser.js';
import { resolve } from 'path';
import { generateFilterComplex } from './generator.js';
import { prepareProject } from './project.js';
import { generateFFmpegCommand } from './ffmpeg.js';
import { spawn } from 'child_process';

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
  console.log('Progress:\n');

  // Parse command into array (handle quoted paths)
  const args = ffmpegCommand
    .slice('ffmpeg '.length)
    .match(/(?:[^\s"]+|"[^"]*")+/g)
    ?.map((arg) => arg.replace(/^"|"$/g, '')) || [];

  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // FFmpeg outputs progress to stderr
    let stderrBuffer = '';
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderrBuffer += output;

      // Show all output for debugging
      process.stderr.write(output);
    });

    ffmpeg.on('close', (code) => {
      process.stdout.write('\n');
      if (code === 0) {
        console.log('\n=== Render Complete ===');
        console.log(`Output file: ${project.output.path}`);
        resolve();
      } else {
        console.error(`\n=== Render Failed ===`);
        console.error(`FFmpeg exited with code ${code}`);
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('\n=== Render Failed ===');
      console.error('Error:', error.message);
      reject(error);
    });
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
