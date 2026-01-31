/**
 * Token management utilities for secure JWT handling
 * Manages access tokens in memory and refresh tokens in localStorage
 */

class TokenManager {
  private accessToken: string | null = null;
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  /**
   * Set tokens in storage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    // Store access token in memory for security
    this.accessToken = accessToken;

    // Store refresh token in localStorage for persistence
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Get access token from memory
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if user is authenticated (has valid tokens)
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.getRefreshToken());
  }

  /**
   * Update only the access token (used during refresh)
   */
  updateAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  /**
   * Initialize token manager (called on app startup)
   * Attempts to restore session if refresh token exists
   */
  initialize(): { hasRefreshToken: boolean } {
    const refreshToken = this.getRefreshToken();

    // If we have a refresh token but no access token in memory,
    // we need to refresh the session
    if (refreshToken && !this.accessToken) {
      return { hasRefreshToken: true };
    }

    return { hasRefreshToken: false };
  }

  /**
   * Extract user ID from access token (basic JWT parsing)
   * Note: This is for convenience only - never trust client-side JWT parsing for security
   */
  getUserIdFromToken(): string | null {
    if (!this.accessToken) return null;

    try {
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return null;

      const payloadBase64 = parts[1];
      if (!payloadBase64) return null;

      const payload = JSON.parse(atob(payloadBase64));
      return payload.sub || null;
    } catch (error) {
      console.warn('Failed to parse access token:', error);
      return null;
    }
  }

  /**
   * Check if access token is expired (basic check)
   * Note: This is for UI convenience - server-side validation is authoritative
   */
  isAccessTokenExpired(): boolean {
    if (!this.accessToken) return true;

    try {
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) return true;

      const payloadBase64 = parts[1];
      if (!payloadBase64) return true;

      const payload = JSON.parse(atob(payloadBase64));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.warn('Failed to check token expiration:', error);
      return true;
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();