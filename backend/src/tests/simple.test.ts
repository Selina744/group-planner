/**
 * Simple test to verify Bun testing infrastructure
 */

import { describe, it, expect } from 'bun:test';

describe('Bun Testing Infrastructure', () => {
  it('should run basic assertions', () => {
    expect(2 + 2).toBe(4);
    expect('hello').toBe('hello');
    expect(true).toBeTruthy();
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
    expect(obj.name).toBe('test');
  });
});