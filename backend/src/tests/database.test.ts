/**
 * Database Infrastructure Test
 * Tests core database connectivity and fixtures without Express app
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { UserFixtures, TripFixtures } from './utils/test-fixtures.js';
import { getTestDb } from './utils/test-database.js';

describe('Database Infrastructure', () => {
  const prisma = getTestDb();

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.itemClaim.deleteMany();
      await prisma.item.deleteMany();
      await prisma.tripMember.deleteMany();
      await prisma.trip.deleteMany();
      await prisma.user.deleteMany();
    } catch (error) {
      console.log('Cleanup error (may be expected):', error);
    }
    await prisma.$disconnect();
  });

  it('should connect to test database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should create test user with correct schema', async () => {
    const user = await UserFixtures.createUser({
      email: 'test-user@example.com',
      username: 'testuser',
      displayName: 'Test User'
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test-user@example.com');
    expect(user.username).toBe('testuser');
    expect(user.passwordHash).toBeDefined();
    expect(user.emailVerified).toBe(true);
    expect(user.id).toBeDefined();
  });

  it('should create test trip with relationships', async () => {
    const hostUser = await UserFixtures.createUser({
      email: 'host@example.com',
      displayName: 'Host User'
    });

    const { trip, membership } = await TripFixtures.createTrip(hostUser.id);

    expect(trip).toBeDefined();
    expect(trip.title).toBeDefined();
    expect(membership).toBeDefined();
    expect(membership.userId).toBe(hostUser.id);
    expect(membership.role).toBe('HOST');
  });

  it('should handle database transactions', async () => {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: 'transaction-test@example.com',
          passwordHash: '$2b$10$test',
          displayName: 'Transaction Test'
        }
      });

      expect(user.id).toBeDefined();

      const count = await tx.user.count({
        where: { email: 'transaction-test@example.com' }
      });

      expect(count).toBe(1);
    });
  });
});