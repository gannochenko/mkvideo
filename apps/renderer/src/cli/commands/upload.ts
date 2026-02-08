import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { HTMLParser } from '../../html-parser.js';
import { HTMLProjectParser } from '../../html-project-parser.js';
import { handleYouTubeUpload } from '../youtube/upload-handler.js';

export function registerUploadCommand(
  program: Command,
  handleError: (error: any, operation: string) => void,
): void {
  program
    .command('upload')
    .description('Upload video to YouTube')
    .option('-p, --project <path>', 'Path to project directory', '.')
    .requiredOption('--upload-name <name>', 'Name of the upload configuration')
    .action(async (options) => {
      try {
        const clientId = process.env.STATICSTRIPES_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.STATICSTRIPES_GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error(
            '❌ Error: STATICSTRIPES_GOOGLE_CLIENT_ID and STATICSTRIPES_GOOGLE_CLIENT_SECRET environment variables are not set',
          );
          console.error('\n💡 Run: staticstripes auth --help');
          console.error('   for complete setup instructions\n');
          process.exit(1);
        }

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

        // Validate output file exists
        const upload = project.getYouTubeUpload(options.uploadName);
        if (upload) {
          const output = project.getOutput(upload.outputName);
          if (output && !existsSync(output.path)) {
            console.error(`Error: Output file not found: ${output.path}`);
            console.error(
              'Please generate the video first with: staticstripes generate',
            );
            process.exit(1);
          }
        }

        // Handle YouTube upload
        await handleYouTubeUpload(project, {
          uploadName: options.uploadName,
          projectPath,
          clientId,
          clientSecret,
        });
      } catch (error) {
        handleError(error, 'Upload');
        process.exit(1);
      }
    });
}
