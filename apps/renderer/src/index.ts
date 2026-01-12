import { parseHTMLFile } from './parser.js';
import { resolve } from 'path';
import { generateFilterComplex } from './generator.js';
import { prepareProject } from './project.js';

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
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
