import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { YouTubeUploader } from '../../youtube-uploader.js';
import open from 'open';

function getOAuthInstructions(): string {
  let instructions = '';
  instructions += '❌ Error: STATICSTRIPES_GOOGLE_CLIENT_ID and STATICSTRIPES_GOOGLE_CLIENT_SECRET environment variables are not set\n\n';
  instructions += '📋 Getting Google OAuth Credentials:\n\n';
  instructions += '1. Go to Google Cloud Console:\n';
  instructions += '   https://console.cloud.google.com/\n\n';
  instructions += '2. Create or select a project\n\n';
  instructions += '3. Enable YouTube Data API v3:\n';
  instructions += '   - Go to "APIs & Services" > "Library"\n';
  instructions += '   - Search for "YouTube Data API v3"\n';
  instructions += '   - Click "Enable"\n\n';
  instructions += '4. Configure OAuth Consent Screen:\n';
  instructions += '   - Go to "APIs & Services" > "OAuth consent screen"\n';
  instructions += '   - Choose "External" user type\n';
  instructions += '   - Fill in app name and contact emails\n';
  instructions += '   - Add scope: https://www.googleapis.com/auth/youtube.upload\n';
  instructions += '   - Add your email as a test user\n\n';
  instructions += '5. Create OAuth 2.0 Credentials:\n';
  instructions += '   - Go to "APIs & Services" > "Credentials"\n';
  instructions += '   - Click "Create Credentials" > "OAuth client ID"\n';
  instructions += '   - Choose "Web application"\n';
  instructions += '   - Add redirect URI: http://localhost:3000/oauth2callback\n';
  instructions += '   - Click "Create"\n\n';
  instructions += '6. Copy your Client ID and Client Secret\n\n';
  instructions += '7. Set environment variables:\n\n';

  // Platform-specific instructions
  const platform = process.platform;
  if (platform === 'win32') {
    instructions += '   PowerShell (Recommended) - Run as Administrator:\n';
    instructions += '     [System.Environment]::SetEnvironmentVariable("STATICSTRIPES_GOOGLE_CLIENT_ID", "your-client-id.apps.googleusercontent.com", "User")\n';
    instructions += '     [System.Environment]::SetEnvironmentVariable("STATICSTRIPES_GOOGLE_CLIENT_SECRET", "your-client-secret", "User")\n';
    instructions += '   Then restart your terminal\n\n';
    instructions += '   Or Command Prompt - Run as Administrator:\n';
    instructions += '     setx STATICSTRIPES_GOOGLE_CLIENT_ID "your-client-id.apps.googleusercontent.com"\n';
    instructions += '     setx STATICSTRIPES_GOOGLE_CLIENT_SECRET "your-client-secret"\n';
    instructions += '   Then restart your terminal\n\n';
  } else if (platform === 'darwin') {
    instructions += '   Add to ~/.zshrc (or ~/.bash_profile for bash):\n';
    instructions += '     export STATICSTRIPES_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"\n';
    instructions += '     export STATICSTRIPES_GOOGLE_CLIENT_SECRET="your-client-secret"\n\n';
    instructions += '   Then reload your shell:\n';
    instructions += '     source ~/.zshrc\n\n';
  } else {
    // Linux and others
    instructions += '   Add to ~/.bashrc (or ~/.zshrc for zsh):\n';
    instructions += '     export STATICSTRIPES_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"\n';
    instructions += '     export STATICSTRIPES_GOOGLE_CLIENT_SECRET="your-client-secret"\n\n';
    instructions += '   Then reload your shell:\n';
    instructions += '     source ~/.bashrc  # or source ~/.zshrc\n\n';
  }

  return instructions;
}

export function registerAuthCommands(program: Command): void {
  program
    .command('auth')
    .description('Authenticate with YouTube for uploading')
    .option('-p, --project <path>', 'Path to project directory', '.')
    .requiredOption('--upload-name <name>', 'Name of the upload configuration')
    .action(async (options) => {
      try {
        // Get OAuth credentials from environment variables
        const clientId = process.env.STATICSTRIPES_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.STATICSTRIPES_GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error(getOAuthInstructions());
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
        console.log(`🔐 Authenticating: ${options.uploadName}\n`);

        // Create uploader instance
        const uploader = new YouTubeUploader(clientId, clientSecret);

        // Get authorization URL
        const authUrl = uploader.getAuthUrl();

        console.log('🌐 Opening browser for authorization...\n');

        // Open browser automatically
        try {
          await open(authUrl);
          console.log('✅ Browser opened successfully\n');
        } catch (err) {
          console.log('⚠️  Could not open browser automatically');
          console.log('🌐 Please visit this URL to authorize:\n');
          console.log(authUrl);
        }

        console.log('\n⚠️  After authorizing, copy the authorization code from the URL');
        console.log(
          '⚠️  Then run: staticstripes auth-complete --upload-name <name> --code <code>',
        );
      } catch (error: any) {
        console.error(`\n❌ Authentication failed\n`);
        if (error.message) {
          console.error(`Error: ${error.message}\n`);
        }
        process.exit(1);
      }
    });

  program
    .command('auth-complete')
    .description('Complete authentication with authorization code')
    .option('-p, --project <path>', 'Path to project directory', '.')
    .requiredOption('--upload-name <name>', 'Name of the upload configuration')
    .requiredOption('--code <code>', 'Authorization code from OAuth flow')
    .action(async (options) => {
      try {
        const clientId = process.env.STATICSTRIPES_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.STATICSTRIPES_GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          console.error('❌ Error: STATICSTRIPES_GOOGLE_CLIENT_ID and STATICSTRIPES_GOOGLE_CLIENT_SECRET environment variables are not set');
          console.error('\n💡 Run: staticstripes auth --help');
          console.error('   for complete setup instructions\n');
          process.exit(1);
        }

        const projectPath = resolve(process.cwd(), options.project);

        // Create uploader and complete authentication
        const uploader = new YouTubeUploader(clientId, clientSecret);
        await uploader.authenticate(options.code, options.uploadName, projectPath);

        console.log(`✅ Authentication complete for ${options.uploadName}`);
      } catch (error: any) {
        console.error(`\n❌ Authentication completion failed\n`);
        if (error.message) {
          console.error(`Error: ${error.message}\n`);
        }
        process.exit(1);
      }
    });
}
