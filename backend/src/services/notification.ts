import { prisma } from '../lib/prisma.js'
import { log } from '../utils/logger.js'

export interface NotificationCreateInput {
  userId: string
  tripId?: string
  type: string
  title: string
  body?: string
  payload?: Record<string, unknown>
}

export interface NotificationListOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
}

export class NotificationService {
  private static readonly DEFAULT_LIMIT = 50

  static async listNotifications(userId: string, options: NotificationListOptions = {}) {
    const { limit = this.DEFAULT_LIMIT, offset = 0, unreadOnly = false } = options
    const where: Record<string, unknown> = { userId }

    if (unreadOnly) {
      Object.assign(where, { read: false })
    }

    log.debug('Listing notifications', { userId, limit, offset, unreadOnly })

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  static async createNotification(input: NotificationCreateInput) {
    const record = {
      userId: input.userId,
      tripId: input.tripId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      payload: (input.payload ?? {}) as any,
      read: false,
      readAt: null,
    }

    log.info('Creating notification', { userId: input.userId, tripId: input.tripId, type: input.type })

    return prisma.notification.create({
      data: record,
    })
  }

  static async markAsRead(userId: string, notificationId: string) {
    const now = new Date()

    log.debug('Marking notification read', { userId, notificationId })

    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId, read: false },
      data: { read: true, readAt: now },
    })

    return result.count > 0
  }

  static async markAllAsRead(userId: string, tripId?: string) {
    const where: Record<string, unknown> = { userId, read: false }
    if (tripId) {
      Object.assign(where, { tripId })
    }

    log.debug('Marking all notifications read', { userId, tripId })

    const result = await prisma.notification.updateMany({
      where,
      data: { read: true, readAt: new Date() },
    })

    return result.count
  }
}
