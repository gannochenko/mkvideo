import { AuthStrategy, AuthOptions } from '../auth-strategy';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import open from 'open';
import http from 'http';
import { parse as parseUrl } from 'url';
import * as readline from 'readline';

/**
 * Instagram authentication strategy
 * Automatic OAuth flow with browser redirect (like YouTube)
 */
export class InstagramAuthStrategy implements AuthStrategy {
  getTag(): string {
    return 'instagram';
  }

  async execute(
    uploadName: string,
    projectPath: string,
    options?: AuthOptions,
  ): Promise<void> {
    console.log(`🔐 Instagram Authentication Setup\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer);
        });
      });
    };

    try {
      console.log('━'.repeat(60));
      console.log('STEP 1: Enter Instagram App Credentials');
      console.log('━'.repeat(60));
      console.log('');
      console.log('💡 Run `staticstripes auth-help instagram` for setup instructions\n');

      const appId = await question('Enter your Instagram App ID: ');
      if (!appId || appId.trim().length < 5) {
        throw new Error('Invalid App ID');
      }

      const appSecret = await question('Enter your Instagram App Secret: ');
      if (!appSecret || appSecret.trim().length < 10) {
        throw new Error('Invalid App Secret');
      }

      // Use provided redirect URL or default to localhost
      const redirectUri =
        options?.oauthRedirectUrl || 'http://localhost:3000/oauth2callback';

      console.log(`\n🔗 Using OAuth Redirect URI: ${redirectUri}`);
      if (!redirectUri.includes('localhost')) {
        console.log('✅ Using external URL (ngrok/Cloudflare)');
      } else {
        console.log(
          '⚠️  Using localhost - this may not work with Instagram. Consider using --oauth-redirect-url with ngrok/Cloudflare',
        );
      }

      console.log('\n━'.repeat(60));
      console.log('STEP 2: Authorize with Instagram');
      console.log('━'.repeat(60));
      console.log('');

      rl.close();

      console.log('🌐 Starting local server on http://localhost:3000...\n');

      // Wait for OAuth callback
      const authCode = await this.waitForAuthCode(
        appId.trim(),
        redirectUri.trim(),
      );

      console.log('🔑 Authorization code received\n');
      console.log('🔄 Exchanging for access token...\n');

      // Exchange code for short-lived token
      const shortLivedToken = await this.exchangeCodeForToken(
        authCode,
        appId.trim(),
        appSecret.trim(),
        redirectUri.trim(),
      );

      console.log('✅ Short-lived token received\n');
      console.log('🔄 Exchanging for long-lived token (60 days)...\n');

      // Exchange for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(
        shortLivedToken,
        appSecret.trim(),
      );

      console.log('✅ Long-lived token received\n');
      console.log('🔍 Fetching Instagram account info...\n');

      // Get Instagram user ID
      const { id, username } = await this.getInstagramUserId(longLivedToken);

      console.log(`✅ Account: @${username}`);
      console.log(`✅ Instagram User ID: ${id}\n`);
      console.log('💾 Saving credentials...\n');

      // Save credentials
      const authDir = resolve(projectPath, '.auth');
      if (!existsSync(authDir)) {
        mkdirSync(authDir, { recursive: true });
      }

      const credentialsPath = resolve(authDir, `${uploadName}.json`);
      const credentials = {
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        accessToken: longLivedToken,
        igUserId: id,
      };

      writeFileSync(
        credentialsPath,
        JSON.stringify(credentials, null, 2),
        'utf-8',
      );

      console.log(`✅ Authentication complete for ${uploadName}!\n`);
      console.log(`📁 Credentials saved to: ${credentialsPath}\n`);
      console.log('⚠️  Token expires in 60 days - set a reminder to refresh!\n');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generates Instagram OAuth authorization URL
   */
  private getAuthUrl(appId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_business_basic,instagram_business_content_publish',
      response_type: 'code',
      state: Math.random().toString(36).substring(7),
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Starts local HTTP server and waits for OAuth callback
   */
  private async waitForAuthCode(
    appId: string,
    redirectUri: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const connections = new Set<any>();

      const server = http.createServer((req, res) => {
        const url = parseUrl(req.url || '', true);

        if (url.pathname === '/oauth2callback') {
          const code = url.query.code as string;
          const error = url.query.error as string;

          const closeServer = () => {
            connections.forEach((socket) => socket.destroy());
            connections.clear();
            server.close();
          };

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>❌ Authorization Failed</h1>
                  <p>Error: ${error}</p>
                  <p>${url.query.error_description || ''}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            res.on('finish', closeServer);
            reject(new Error(`Authorization failed: ${error}`));
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>Authorization Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </body>
              </html>
            `);
            res.on('finish', closeServer);
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>❌ No Authorization Code</h1>
                  <p>No code was received from Instagram.</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            res.on('finish', closeServer);
            reject(new Error('No authorization code received'));
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.on('connection', (socket) => {
        connections.add(socket);
        socket.on('close', () => connections.delete(socket));
      });

      server.listen(3000, async () => {
        console.log('✅ Server started successfully\n');
        console.log(
          `🌐 Opening browser for authorization, redirect url = ${redirectUri}\n`,
        );

        const authUrl = this.getAuthUrl(appId, redirectUri);
        try {
          await open(authUrl);
          console.log('✅ Browser opened successfully\n');
        } catch (err) {
          console.log('⚠️  Could not open browser automatically');
          console.log('🌐 Please visit this URL to authorize:\n');
          console.log(authUrl);
          console.log();
        }

        console.log('⏳ Waiting for authorization...\n');
      });

      setTimeout(
        () => {
          connections.forEach((socket) => socket.destroy());
          connections.clear();
          server.close();
          reject(new Error('Authentication timeout (5 minutes)'));
        },
        5 * 60 * 1000,
      );
    });
  }

  /**
   * Exchanges authorization code for short-lived access token
   */
  private async exchangeCodeForToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    const response = await fetch(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        body: params,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to exchange code for token: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as { access_token?: string };

    if (!data.access_token) {
      throw new Error('No access token in response');
    }

    return data.access_token;
  }

  /**
   * Exchanges short-lived token for long-lived token (60 days)
   */
  private async exchangeForLongLivedToken(
    shortLivedToken: string,
    appSecret: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to exchange for long-lived token: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as { access_token?: string };

    if (!data.access_token) {
      throw new Error('No long-lived access token in response');
    }

    return data.access_token;
  }

  /**
   * Gets the Instagram user ID and username from the /me endpoint
   */
  private async getInstagramUserId(
    accessToken: string,
  ): Promise<{ id: string; username: string }> {
    const params = new URLSearchParams({
      fields: 'id,username',
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/me?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get Instagram user info: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as { id?: string; username?: string };

    if (!data.id || !data.username) {
      throw new Error('No user ID or username in response');
    }

    return { id: data.id, username: data.username };
  }

  getSetupInstructions(): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instagram Authentication Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interactive OAuth flow with automatic token exchange.

⚠️  PREREQUISITES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Instagram Business or Creator account (NOT personal)
  ✅ Facebook account (for creating the app)
  ✅ ngrok or Cloudflare Tunnel (Meta doesn't allow localhost)

Convert to Business/Creator if needed:
  Instagram app → Profile → Menu → Settings → Account
  → "Switch to Professional Account" → Choose Business or Creator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Create Facebook App with Instagram Use Case
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: https://developers.facebook.com
2. Click "Get Started" → Log in → Complete registration
3. Click "My Apps" → "Create App"
4. When asked about use case, select:
   ⭐ "Manage messaging & content on Instagram"
5. Select app type: "Business"
6. Fill in:
   • App name: "My Instagram Uploader"
   • Contact email: your.email@example.com
7. Click "Create App"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Publish App to Production (IMPORTANT!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Publishing to production avoids test environment limitations.

1. In app dashboard, look for "App Mode" toggle or similar
2. Switch from "Development" to "Live" mode
3. Or find "Publish" button and click it

Note: For personal use, you don't need Meta verification.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Navigate to Instagram Customize Wizard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Go to: Dashboard → Use Cases
2. Find "Manage messaging & content on Instagram"
3. Click "Customize" button

You'll see a wizard with several steps. Follow them in order:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Copy App Credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
At the top of the Customize page, you'll see:
  • Instagram App ID (copy this!)
  • Instagram App Secret (click "Show" to reveal, copy this!)

Keep these handy - you'll need them for the auth wizard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: Add Required Permissions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In the wizard, find "Add required messaging permissions" section:

1. Look for permissions list
2. Enable these permissions:
   • instagram_business_basic
   • instagram_business_content_publish
3. Save changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6: Generate Access Token & Add Account
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In the wizard, find "Generate access token" section:

1. Click "Add account"
2. You'll be prompted to authenticate with Instagram
3. If you have a personal account, convert it to Business/Creator
4. Allow access for the app
5. Complete the authorization flow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7: Set Up Tunnel (ngrok or Cloudflare)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT: Meta doesn't allow localhost:3000 as callback domain!
   You MUST use ngrok or Cloudflare Tunnel BEFORE running auth.

Option A - Using ngrok (simpler but unstable domain):
  1. Install ngrok: https://ngrok.com/download
  2. Run: ngrok http 3000
  3. Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)
  4. Keep ngrok running!

  ⚠️  WARNING: ngrok URLs change on restart!
      You'll need to update Meta redirect URI each time.

Option B - Using Cloudflare Tunnel (stable domain, recommended):
  1. Set up Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
  2. Tunnel localhost:3000 to a stable domain
  3. Your URL will be stable (e.g., https://your-domain.com)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8: Configure OAuth Redirect URI in Meta
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In the wizard, find "Set up Instagram business login" → "Business login settings":

1. Add to "OAuth Redirect URIs":
   https://your-tunnel-url/oauth2callback

   Examples:
   • ngrok: https://abc123.ngrok-free.app/oauth2callback
   • Cloudflare: https://your-domain.com/oauth2callback

2. Click "Save"

⚠️  Make sure path ends with /oauth2callback (no trailing slash!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9: Run Authentication Command
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Make sure your tunnel (ngrok/Cloudflare) is running, then:

WITHOUT ngrok/Cloudflare (will likely fail with Instagram):
  staticstripes auth --upload-name YOUR_UPLOAD_NAME

WITH ngrok/Cloudflare (recommended):
  staticstripes auth --upload-name YOUR_UPLOAD_NAME \\
    --oauth-redirect-url https://your-tunnel-url/oauth2callback

Example with ngrok:
  staticstripes auth --upload-name ig_primary \\
    --oauth-redirect-url https://abc123.ngrok-free.app/oauth2callback

Example with Cloudflare:
  staticstripes auth --upload-name ig_primary \\
    --oauth-redirect-url https://your-domain.com/oauth2callback

The command will:
1. Ask you to enter Instagram App ID
2. Ask you to enter Instagram App Secret
3. Use the redirect URL you specified (or default to localhost)
4. Start local server on port 3000
5. Open browser for Instagram authorization
6. Automatically exchange tokens (short-lived → long-lived)
7. Fetch your Instagram User ID
8. Save ALL credentials to .auth/YOUR_UPLOAD_NAME.json

Done! Your credentials are saved locally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOKEN REFRESH (Every 60 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tokens expire after 60 days. To refresh:

  curl -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_CURRENT_TOKEN"

💡 Set a calendar reminder for 50 days!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ "redirect_uri_mismatch"
   → Meta doesn't accept localhost - use ngrok/Cloudflare
   → Make sure redirect URI in Meta matches redirectUri in code
   → Check for typos (no trailing slash!)
   → If using ngrok, domain changes on restart - update everywhere!

❌ "Can't find the wizard or Customize button"
   → Dashboard → Use Cases → "Manage messaging & content on Instagram"
   → If you don't see "Customize", your app might not have the right use case

❌ "Insufficient permissions" error
   → Make sure you completed Step 5 (Add required permissions)
   → Enable: instagram_business_basic, instagram_business_content_publish

❌ "Invalid access token"
   → Token might be expired (60 days max)
   → Re-run: staticstripes auth --upload-name YOUR_UPLOAD_NAME

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE LINKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Facebook Apps Dashboard:
  https://developers.facebook.com/apps/

• Instagram Graph API docs:
  https://developers.facebook.com/docs/instagram-api/

• ngrok download:
  https://ngrok.com/download

• Cloudflare Tunnel:
  https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }
}
