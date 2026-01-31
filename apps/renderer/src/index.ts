import { HTMLParser } from './html-parser.js';
import { resolve, dirname } from 'path';
import { makeFFmpegCommand, runFFMpeg } from './ffmpeg.js';
import { getAssetDuration } from './ffprobe.js';
import { HTMLProjectParser } from './html-project-parser.js';
import { renderContainers } from './container-renderer.js';

async function main() {
  // Parse the demo project HTML file
  const projectPath = resolve(__dirname, '../../../examples/demo/project.html');

  // converting AST to the Project
  const parser = new HTMLProjectParser(
    await new HTMLParser().parseFile(projectPath),
    projectPath,
  );
  const project = await parser.parse();

  // Use the default output name
  const outputName = 'youtube';

  console.log('\n=== Project stats ===\n');

  project.printStats();

  // Check for fragments with containers and render them before building
  const sequences = project.getSequenceDefinitions();
  const fragmentsWithContainers = sequences.flatMap((seq) =>
    seq.fragments.filter((frag) => frag.container),
  );

  if (fragmentsWithContainers.length > 0) {
    console.log('\n=== Rendering Containers ===\n');

    const output = project.getOutput(outputName);
    if (!output) {
      throw new Error(`Output "${outputName}" not found`);
    }

    const containers = fragmentsWithContainers.map((frag) => frag.container!);
    const projectDir = dirname(projectPath);

    await renderContainers(
      containers,
      project.getCssText(),
      output.resolution.width,
      output.resolution.height,
      projectDir,
    );

    console.log(`\nRendered ${containers.length} container(s)\n`);
  }

  const filterBuf = project.build(outputName);

  const ffmpegCommand = makeFFmpegCommand(
    project,
    filterBuf.render(),
    outputName,
  );

  console.log('\n=== Command ===');

  console.log(ffmpegCommand);

  console.log('\n=== Starting Render ===');
  console.log('Progress:\n');

  await runFFMpeg(ffmpegCommand);

  const output = project.getOutput(outputName);
  if (!output) {
    throw new Error(`Output "${outputName}" not found`);
  }
  const resultPath = output.path;
  console.log(`Output file: ${resultPath}`);
  const resultDuration = await getAssetDuration(resultPath);
  console.log(`Output duration: ${resultDuration}ms`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
