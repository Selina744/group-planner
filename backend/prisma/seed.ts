import 'dotenv/config'

import bcrypt from 'bcrypt'
import {
  ClaimStatus,
  EventStatus,
  ItemType,
  MemberRole,
  MemberStatus,
  PrismaClient,
} from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'GroupPlanner!2026'

const demoUsers = [
  {
    email: 'host@groupplanner.test',
    username: 'host-leader',
    displayName: 'Jordan Host',
    timezone: 'America/Los_Angeles',
  },
  {
    email: 'cohost@groupplanner.test',
    username: 'cohost-jane',
    displayName: 'Jane Co-Host',
    timezone: 'America/Denver',
  },
  {
    email: 'member@groupplanner.test',
    username: 'member-max',
    displayName: 'Max Member',
    timezone: 'America/Chicago',
  },
]

async function cleanupDemoData(): Promise<void> {
  // Delete dependent tables first to satisfy FK constraints
  await prisma.itemClaim.deleteMany()
  await prisma.item.deleteMany()
  await prisma.event.deleteMany()
  await prisma.notificationPreference.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.tripExtension.deleteMany()
  await prisma.tripMember.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.passwordReset.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
}

async function createUsers(passwordHash: string) {
  return Promise.all(
    demoUsers.map((user) =>
      prisma.user.create({
        data: {
          ...user,
          passwordHash,
          emailVerified: true,
        },
      })
    )
  )
}

async function seed(): Promise<void> {
  console.info('Clearing existing demo data...')
  await cleanupDemoData()

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const [host, coHost, member] = await createUsers(passwordHash)

  const trip = await prisma.trip.create({
    data: {
      title: 'Sierra Crest Adventure',
      description: 'A hybrid hiking and lakeside camping trip across Sierra Campgrounds.',
      location: {
        name: 'Sierra Crest Basecamp',
        latitude: 37.8651,
        longitude: -119.5383,
        address: 'Tuolumne Meadows, Yosemite National Park, CA',
      },
      startDate: new Date('2026-06-10T09:00:00.000Z'),
      endDate: new Date('2026-06-15T17:00:00.000Z'),
      metadata: {
        vibe: 'high-country camping',
        focus: 'scenic hiking & lakeside meals',
      },
    },
  })

  await prisma.tripMember.createMany({
    data: [
      {
        tripId: trip.id,
        userId: host.id,
        role: MemberRole.HOST,
        status: MemberStatus.CONFIRMED,
        notifications: true,
        canInvite: true,
      },
      {
        tripId: trip.id,
        userId: coHost.id,
        role: MemberRole.CO_HOST,
        status: MemberStatus.CONFIRMED,
        notifications: true,
        canInvite: false,
      },
      {
        tripId: trip.id,
        userId: member.id,
        role: MemberRole.MEMBER,
        status: MemberStatus.CONFIRMED,
        notifications: true,
        canInvite: false,
      },
    ],
  })

  const events = [
    {
      title: 'Arrival & camp set-up',
      description: 'Hands-on set-up for tents, kitchen area, and briefing.',
      status: EventStatus.APPROVED,
      startTime: new Date('2026-06-10T15:00:00.000Z'),
      endTime: new Date('2026-06-10T18:00:00.000Z'),
      isAllDay: false,
      category: 'CAMP',
      estimatedCost: 0,
      currency: 'USD',
      suggestedById: host.id,
    },
    {
      title: 'Summit ridge hike',
      description: 'Guided hike along the crest with photographers on standby.',
      status: EventStatus.PROPOSED,
      startTime: new Date('2026-06-11T07:00:00.000Z'),
      endTime: new Date('2026-06-11T14:00:00.000Z'),
      isAllDay: true,
      category: 'HIKING',
      estimatedCost: 0,
      currency: 'USD',
      suggestedById: coHost.id,
    },
    {
      title: 'Lakeside dinner + stargazing',
      description: 'Potluck-style dinner with hot cocoa around the lodge fire pit.',
      status: EventStatus.APPROVED,
      startTime: new Date('2026-06-12T18:00:00.000Z'),
      endTime: new Date('2026-06-12T21:30:00.000Z'),
      isAllDay: false,
      category: 'DINING',
      estimatedCost: 150,
      currency: 'USD',
      suggestedById: host.id,
    },
    {
      title: 'River cleanup service',
      description: 'Volunteer cleanup of the creek that runs past basecamp.',
      status: EventStatus.PROPOSED,
      startTime: new Date('2026-06-13T09:30:00.000Z'),
      endTime: new Date('2026-06-13T12:00:00.000Z'),
      isAllDay: false,
      category: 'SERVICE',
      estimatedCost: 0,
      currency: 'USD',
      suggestedById: member.id,
    },
    {
      title: 'Departure & debrief',
      description: 'Pack-up, share highlights, and confirm future meetups.',
      status: EventStatus.CANCELLED,
      startTime: new Date('2026-06-15T10:00:00.000Z'),
      endTime: new Date('2026-06-15T12:00:00.000Z'),
      isAllDay: false,
      category: 'MEETING',
      estimatedCost: 0,
      currency: 'USD',
      suggestedById: host.id,
    },
  ]

  await prisma.event.createMany({
    data: events.map((event) => ({
      ...event,
      tripId: trip.id,
      approvedById: event.status === EventStatus.APPROVED ? host.id : null,
      suggestedById: event.suggestedById,
    })),
  })

  const recommendedItems = [
    {
      name: 'Solar lanterns',
      description: 'Rechargeable lanterns for each campsite quadrant.',
      category: 'GEAR',
      type: ItemType.RECOMMENDED,
      quantityNeeded: 4,
    },
    {
      name: 'Trail mix packets',
      description: 'Bulk mix of nuts, dried fruit, and chocolate chips.',
      category: 'FOOD',
      type: ItemType.RECOMMENDED,
      quantityNeeded: 12,
    },
    {
      name: 'Weather-resistant campground map',
      description: 'Printable topo maps and emergency exit routes.',
      category: 'NAVIGATION',
      type: ItemType.RECOMMENDED,
      quantityNeeded: 1,
    },
    {
      name: 'Windproof Bluetooth speaker',
      description: 'Shared speaker for group announcements and playlists.',
      category: 'TECH',
      type: ItemType.RECOMMENDED,
      quantityNeeded: 1,
    },
  ]

  for (const item of recommendedItems) {
    await prisma.item.create({
      data: {
        ...item,
        tripId: trip.id,
        createdById: host.id,
      },
    })
  }

  const sharedItems = [
    {
      name: 'Camp stove & fuel',
      description: 'Portable propane stove with two burners.',
      type: ItemType.SHARED,
      quantityNeeded: 1,
      claims: [
        { userId: coHost.id, quantity: 1, notes: 'Will bring fuel' },
      ],
    },
    {
      name: 'Polarized kayak cooler',
      description: 'Keep drinks chilled on the beachside dock.',
      type: ItemType.SHARED,
      quantityNeeded: 1,
      claims: [
        { userId: member.id, quantity: 1, notes: 'Fits with my kayak gear' },
      ],
    },
    {
      name: 'Group first-aid kit',
      description: 'Advanced kit with trauma dressing and OTC meds.',
      type: ItemType.SHARED,
      quantityNeeded: 1,
      claims: [
        { userId: host.id, quantity: 1, notes: 'I am the medical lead' },
      ],
    },
    {
      name: 'Extra padded sleeping mats',
      description: 'Four mats for guests rotating in the bunk shelter.',
      type: ItemType.SHARED,
      quantityNeeded: 4,
      claims: [
        { userId: member.id, quantity: 2, notes: 'I can transport two' },
        { userId: coHost.id, quantity: 2, notes: 'I will haul the rest' },
      ],
    },
  ]

  for (const sharedItem of sharedItems) {
    const created = await prisma.item.create({
      data: {
        name: sharedItem.name,
        description: sharedItem.description,
        category: 'SHARED',
        type: sharedItem.type,
        quantityNeeded: sharedItem.quantityNeeded,
        tripId: trip.id,
        createdById: coHost.id,
      },
    })

    for (const claim of sharedItem.claims) {
      await prisma.itemClaim.create({
        data: {
          itemId: created.id,
          userId: claim.userId,
          quantity: claim.quantity,
          status: ClaimStatus.CLAIMED,
          notes: claim.notes,
        },
      })
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: host.id,
        tripId: trip.id,
        type: 'trip.created',
        title: 'Trip draft ready',
        body: 'The Sierra Crest itinerary has been seeded with events and items.',
        payload: { ready: true },
      },
      {
        userId: member.id,
        tripId: trip.id,
        type: 'item.assignment',
        title: 'Claim confirmed',
        body: 'You claimed the kayak cooler and extra pads for the group.',
        payload: { item: 'kayak cooler' },
      },
    ],
  })

  await prisma.announcement.create({
    data: {
      tripId: trip.id,
      authorId: host.id,
      title: 'Welcome to Sierra Crest 2026',
      body: 'Pack layers, hydrate, and check the updated itinerary before we drive up on June 10.',
      pinned: true,
    },
  })

  console.info('Seed complete: ready-to-use demo trip created.')
  console.info('Default demo password for all accounts:', DEMO_PASSWORD)
}

seed()
  .catch((error) => {
    console.error('Seed script failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
