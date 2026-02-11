# How I authenticated

1. Created an App with use-case "Manage messaging & content on Instagram"
2. Published the application to production to avoid hassles with testing env limitations
3. Went to Dashboard -> Manage messaging & content on Instagram -> Customize
4. Copied Instagram app ID and Instagram app secret from there
5. There is now a wizard with several steps I must take:
   5.1 Added required permissions under "Add required messaging permissions"
   5.2 Geneerate access token -> Add account -> Authenticate, convert to business account and allow access for the app
   5.3 Set up Instagram business login -> Business login settings, add an URL to "OAuth redirect URIs". Since Meta doesn't allow localhost:3000 as a callback domain, we have to use ngrok to tunnel the call back to our local application (beware of unstable domain), or use Cloudflare Tunneling.
