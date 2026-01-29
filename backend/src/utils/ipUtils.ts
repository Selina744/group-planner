/**
 * IP address utilities for secure client IP extraction
 *
 * Provides functions to safely extract client IP addresses while preventing
 * IP spoofing attacks via X-Forwarded-For header manipulation.
 */

import type { Request } from 'express';
import { log } from './logger.js';

/**
 * Configuration for trusted proxies
 */
interface TrustedProxyConfig {
  /** List of trusted proxy IP addresses/ranges */
  trustedProxies: string[];
  /** Whether to allow forwarded headers in development */
  allowForwardedInDev: boolean;
}

/**
 * Default trusted proxy configuration from environment
 */
const TRUSTED_PROXY_CONFIG: TrustedProxyConfig = {
  trustedProxies: process.env.TRUSTED_PROXIES?.split(',').map(ip => ip.trim()) || [],
  allowForwardedInDev: process.env.ALLOW_FORWARDED_IN_DEV === 'true',
};

/**
 * Check if an IP address is in the trusted proxy list
 */
function isTrustedProxy(ip: string, trustedProxies: string[]): boolean {
  if (!ip || trustedProxies.length === 0) {
    return false;
  }

  // Exact match for now - could be enhanced with CIDR matching
  return trustedProxies.includes(ip);
}

/**
 * Safely extract client IP address from request
 *
 * Only trusts X-Forwarded-For and X-Real-IP headers when they come from
 * known trusted proxies, preventing IP spoofing attacks.
 *
 * @param req Express request object
 * @returns Trusted client IP address
 */
export function getSecureClientIp(req: Request): string {
  const directIp = req.ip || 'unknown';

  // In development, optionally allow forwarded headers for testing
  if (process.env.NODE_ENV === 'development' && TRUSTED_PROXY_CONFIG.allowForwardedInDev) {
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || forwardedFor;
    }

    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp.trim();
    }
  }

  // Only trust forwarded headers from configured trusted proxies
  if (isTrustedProxy(directIp, TRUSTED_PROXY_CONFIG.trustedProxies)) {
    // Trust X-Forwarded-For header
    const forwardedFor = req.get('X-Forwarded-For');
    if (forwardedFor) {
      const clientIp = forwardedFor.split(',')[0]?.trim() || forwardedFor;
      log.debug('Using client IP from X-Forwarded-For', {
        directIp,
        clientIp,
        trustedProxy: true,
      });
      return clientIp;
    }

    // Trust X-Real-IP header as fallback
    const realIp = req.get('X-Real-IP');
    if (realIp) {
      const clientIp = realIp.trim();
      log.debug('Using client IP from X-Real-IP', {
        directIp,
        clientIp,
        trustedProxy: true,
      });
      return clientIp;
    }
  } else if (req.get('X-Forwarded-For') || req.get('X-Real-IP')) {
    // Log potential spoofing attempt
    log.warn('Ignoring forwarded IP headers from untrusted source', {
      directIp,
      forwardedFor: req.get('X-Forwarded-For'),
      realIp: req.get('X-Real-IP'),
      trustedProxies: TRUSTED_PROXY_CONFIG.trustedProxies.length,
      userAgent: req.get('User-Agent'),
    });
  }

  // Use direct connection IP as fallback
  return directIp;
}

/**
 * Check if the current configuration is secure
 */
export function validateIpSecurityConfig(): { secure: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (TRUSTED_PROXY_CONFIG.trustedProxies.length === 0) {
      warnings.push('No trusted proxies configured in production - X-Forwarded-For headers will be ignored');
    }

    if (TRUSTED_PROXY_CONFIG.allowForwardedInDev) {
      warnings.push('ALLOW_FORWARDED_IN_DEV should not be true in production');
    }
  }

  if (TRUSTED_PROXY_CONFIG.trustedProxies.includes('0.0.0.0') ||
      TRUSTED_PROXY_CONFIG.trustedProxies.includes('*')) {
    warnings.push('Trusted proxy configuration is too permissive - avoid wildcard entries');
  }

  return {
    secure: warnings.length === 0,
    warnings,
  };
}

/**
 * Get IP security configuration status
 */
export function getIpConfigStatus(): {
  trustedProxiesCount: number;
  allowForwardedInDev: boolean;
  environment: string;
  warnings: string[];
} {
  const validation = validateIpSecurityConfig();

  return {
    trustedProxiesCount: TRUSTED_PROXY_CONFIG.trustedProxies.length,
    allowForwardedInDev: TRUSTED_PROXY_CONFIG.allowForwardedInDev,
    environment: process.env.NODE_ENV || 'development',
    warnings: validation.warnings,
  };
}