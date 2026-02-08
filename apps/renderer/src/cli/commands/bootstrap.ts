import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { existsSync, mkdirSync, cpSync, realpathSync } from 'fs';

export function registerBootstrapCommand(
  program: Command,
  handleError: (error: any, operation: string) => void,
): void {
  program
    .command('bootstrap')
    .description('Create a new project from template')
    .requiredOption('-n, --name <name>', 'Name of the new project')
    .action((options) => {
      try {
        const projectName = options.name;
        const targetPath = resolve(process.cwd(), projectName);

        // Check if target directory already exists
        if (existsSync(targetPath)) {
          console.error(`Error: Directory "${projectName}" already exists`);
          process.exit(1);
        }

        // Get the template path (relative to the CLI script location)
        // When built, cli.js is in apps/renderer/dist/, and template is at ../../../examples/template
        // Use realpathSync to resolve symlinks when globally linked via npm link
        const scriptPath = realpathSync(process.argv[1]);
        const scriptDir = dirname(scriptPath);
        const templatePath = resolve(scriptDir, '../../../examples/template');

        // Validate template exists
        if (!existsSync(templatePath)) {
          console.error(
            `Error: Template directory not found at ${templatePath}`,
          );
          process.exit(1);
        }

        console.log(`📦 Creating new project "${projectName}"...`);
        console.log(`📂 Template: ${templatePath}`);
        console.log(`🎯 Target: ${targetPath}\n`);

        // Create target directory and copy template contents
        mkdirSync(targetPath, { recursive: true });
        cpSync(templatePath, targetPath, { recursive: true });

        console.log(`✅ Project "${projectName}" created successfully!\n`);
        console.log('Next steps:');
        console.log(`  cd ${projectName}`);
        console.log('  # Edit project.html to customize your video');
        console.log(`  staticstripes generate -p . -o youtube -d\n`);
      } catch (error) {
        handleError(error, 'Project bootstrap');
        process.exit(1);
      }
    });
}
