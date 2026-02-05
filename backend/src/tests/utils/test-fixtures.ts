/**
 * Test Fixtures
 *
 * Provides reusable test data creation utilities
 */

import { PrismaClient, User, Trip, TripMember, Event, Item } from '../../generated/prisma/index.js';
import { getTestDb } from './test-database.js';

/**
 * Test user creation utilities
 */
export class UserFixtures {
  private static prisma = getTestDb();

  /**
   * Create a test user with sensible defaults
   */
  static async createUser(overrides: Partial<User> = {}): Promise<User> {
    // Use process.hrtime for higher precision timing to avoid race conditions
    const [seconds, nanoseconds] = process.hrtime();
    const uniqueId = `${seconds}${nanoseconds}${Math.random().toString(36).substr(2, 8)}`;

    const defaults = {
      email: `test-${uniqueId}@example.com`,
      username: `testuser${uniqueId}`,
      passwordHash: '$2b$10$hashedpassword', // Placeholder for hashed password
      displayName: 'Test User',
      emailVerified: true,
      ...overrides
    };

    return await this.prisma.user.create({
      data: defaults
    });
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count: number, baseOverrides: Partial<User> = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        ...baseOverrides,
        displayName: `Test User ${i + 1}`
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create authenticated test user (returns user and JWT auth token)
   */
  static async createAuthenticatedUser(overrides: Partial<User> = {}): Promise<{
    user: User;
    token: string;
  }> {
    const user = await this.createUser(overrides);

    // Generate a real JWT token for testing
    const { JwtUtils } = await import('../../lib/jwt.js');

    const payload = {
      sub: user.id,
      type: 'access' as const,
      email: user.email,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
    };

    const token = JwtUtils.sign(payload, 'access');

    return { user, token };
  }
}

/**
 * Test trip creation utilities
 */
export class TripFixtures {
  private static prisma = getTestDb();

  /**
   * Create a test trip with sensible defaults
   */
  static async createTrip(hostUserId: string, overrides: Partial<Trip> = {}): Promise<{
    trip: Trip;
    membership: TripMember;
  }> {
    const defaults = {
      title: `Test Trip ${Date.now()}`,
      description: 'A test trip for automated testing',
      location: {
        name: 'San Francisco, CA',
        coordinates: { lat: 37.7749, lng: -122.4194 }
      },
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      endDate: new Date('2026-08-15T00:00:00.000Z'),
      status: 'PLANNING' as const,
      inviteCode: this.generateInviteCode(),
      metadata: { budget: 2000, currency: 'USD' },
      ...overrides
    };

    const trip = await this.prisma.trip.create({
      data: defaults
    });

    // Create HOST membership for creator
    const membership = await this.prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId: hostUserId,
        role: 'HOST',
        status: 'CONFIRMED'
      }
    });

    return { trip, membership };
  }

  /**
   * Add member to trip
   */
  static async addMemberToTrip(
    tripId: string,
    userId: string,
    role: 'HOST' | 'CO_HOST' | 'MEMBER' = 'MEMBER',
    status: 'PENDING' | 'CONFIRMED' | 'DECLINED' = 'CONFIRMED'
  ): Promise<TripMember> {
    return await this.prisma.tripMember.create({
      data: {
        tripId,
        userId,
        role,
        status
      }
    });
  }

  /**
   * Generate a valid invite code
   */
  private static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

/**
 * Test event creation utilities
 */
export class EventFixtures {
  private static prisma = getTestDb();

  /**
   * Create a test event
   */
  static async createEvent(tripId: string, suggestedBy: string, overrides: Partial<Event> = {}): Promise<Event> {
    const defaults = {
      title: `Test Event ${Date.now()}`,
      description: 'A test event for automated testing',
      startTime: new Date('2026-08-02T10:00:00.000Z'),
      endTime: new Date('2026-08-02T12:00:00.000Z'),
      location: {
        name: 'Golden Gate Park',
        coordinates: { lat: 37.7694, lng: -122.4862 }
      },
      status: 'PROPOSED' as const,
      metadata: {},
      ...overrides
    };

    return await this.prisma.event.create({
      data: {
        ...defaults,
        tripId,
        suggestedById: suggestedBy
      }
    });
  }
}

/**
 * Test item creation utilities
 */
export class ItemFixtures {
  private static prisma = getTestDb();

  /**
   * Create a test item
   */
  static async createItem(tripId: string, createdBy: string, overrides: Partial<Item> = {}): Promise<Item> {
    const defaults = {
      name: `Test Item ${Date.now()}`,
      description: 'A test item for automated testing',
      category: 'GENERAL',
      type: 'RECOMMENDED' as const,
      quantityNeeded: 1,
      isEssential: false,
      metadata: {},
      ...overrides
    };

    return await this.prisma.item.create({
      data: {
        ...defaults,
        tripId,
        createdById: createdBy
      }
    });
  }
}

/**
 * Complete test scenario builder
 */
export class ScenarioFixtures {
  /**
   * Create a complete test scenario with trip, users, events, and items
   */
  static async createFullTripScenario(): Promise<{
    host: User;
    members: User[];
    trip: Trip;
    hostMembership: TripMember;
    memberMemberships: TripMember[];
    events: Event[];
    items: Item[];
  }> {
    // Create users
    const host = await UserFixtures.createUser({ displayName: 'Trip Host' });
    const members = await UserFixtures.createUsers(3);

    // Create trip
    const { trip, membership: hostMembership } = await TripFixtures.createTrip(host.id);

    // Add members to trip
    const memberMemberships = await Promise.all(
      members.map(member => TripFixtures.addMemberToTrip(trip.id, member.id))
    );

    // Create events
    const events = await Promise.all([
      EventFixtures.createEvent(trip.id, host.id, { title: 'Welcome Dinner' }),
      EventFixtures.createEvent(trip.id, host.id, { title: 'City Tour' })
    ]);

    // Create items
    const items = await Promise.all([
      ItemFixtures.createItem(trip.id, host.id, { name: 'Sunscreen', category: 'CLOTHING' }),
      ItemFixtures.createItem(trip.id, members[0].id, { name: 'Camera', category: 'ELECTRONICS' })
    ]);

    return {
      host,
      members,
      trip,
      hostMembership,
      memberMemberships,
      events,
      items
    };
  }
}