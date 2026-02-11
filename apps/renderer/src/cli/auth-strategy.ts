/**
 * Options that can be passed to authentication strategies
 */
export interface AuthOptions {
  /**
   * OAuth redirect URL for providers that need it (e.g., Instagram with ngrok)
   */
  oauthRedirectUrl?: string;
}

/**
 * Interface for authentication strategies
 * Each upload provider (YouTube, Instagram, etc.) implements this interface
 */
export interface AuthStrategy {
  /**
   * Returns the tag name this strategy handles (e.g., "youtube", "instagram")
   */
  getTag(): string;

  /**
   * Executes the authentication flow
   * @param uploadName The name of the upload configuration to authenticate
   * @param projectPath The absolute path to the project directory
   * @param options Optional configuration options
   */
  execute(
    uploadName: string,
    projectPath: string,
    options?: AuthOptions,
  ): Promise<void>;

  /**
   * Optional: Returns help/setup instructions for this provider
   */
  getSetupInstructions?(): string;
}
