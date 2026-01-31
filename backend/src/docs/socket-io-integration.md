# Socket.io Integration Guide

## Overview

This document describes the Socket.io real-time communication implementation for the Group Planner API. The integration provides JWT-authenticated WebSocket connections with trip-based rooms for real-time updates.

## Features

- **JWT Handshake Authentication**: Secure WebSocket connections using existing JWT tokens
- **Trip-based Rooms**: Automatic room management for trip-specific real-time updates
- **Connection Management**: Robust connection tracking and cleanup
- **Real-time Notifications**: User-specific and broadcast notifications
- **Security Auditing**: Comprehensive logging of connection events
- **Graceful Shutdown**: Proper cleanup during server shutdown

## Architecture

### Core Components

1. **SocketService** (`src/services/socket.ts`): Main service managing Socket.io server
2. **Socket Types** (`src/types/socket.ts`): TypeScript definitions for Socket.io integration
3. **Socket Routes** (`src/routes/socket.ts`): HTTP endpoints for Socket.io management
4. **Integration Examples** (`src/examples/socket-integration.ts`): Usage patterns

### Authentication Flow

1. Client connects with JWT token (via Authorization header, query param, or cookie)
2. Server validates JWT token and extracts user information
3. Connection is established with user context attached
4. User can join trip-specific rooms for real-time updates

## API Endpoints

### Socket Management

- `GET /api/v1/socket/health` - Socket.io health check
- `GET /api/v1/socket/stats` - Connection statistics (Admin only)
- `GET /api/v1/socket/rooms` - Active rooms (Admin only)
- `GET /api/v1/socket/my-connections` - User's active connections

### Testing Endpoints

- `POST /api/v1/socket/test-notification` - Send test notification
- `POST /api/v1/socket/test-trip-update` - Send test trip update
- `POST /api/v1/socket/broadcast` - Broadcast to all users (Admin only)

## Socket.io Events

### Client → Server Events

- `trip:join` - Join a trip room
- `trip:leave` - Leave a trip room
- `trip:update` - Send trip update
- `ping` - Connection health check

### Server → Client Events

- `connected` - Welcome message on connection
- `trip:joined` - Confirmation of room join
- `trip:left` - Confirmation of room leave
- `trip:updated` - Real-time trip updates
- `user:joined` - User joined room notification
- `user:left` - User left room notification
- `notification` - User-specific notifications
- `pong` - Response to ping

## Client Integration

### JavaScript/TypeScript Client

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data.message);
});

// Join a trip room
socket.emit('trip:join', { tripId: 'trip-123' });

// Listen for trip updates
socket.on('trip:updated', (update) => {
  console.log('Trip update:', update);
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('Notification:', notification);
});
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useSocket(token, tripId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('ws://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connected', () => {
      setConnected(true);
      if (tripId) {
        newSocket.emit('trip:join', { tripId });
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, tripId]);

  return { socket, connected };
}
```

## Server Integration

### Service Integration

```typescript
import { socketService } from '../services/socket.js';

// Send notification to specific user
socketService.sendNotificationToUser(userId, {
  type: 'info',
  title: 'Trip Updated',
  message: 'Your trip has been updated',
  data: { tripId }
});

// Broadcast trip update
socketService.sendTripUpdate(tripId, 'trip:updated', {
  changes: updatedFields,
  updatedBy: userId
});
```

### Route Integration Examples

```typescript
// Trip creation with real-time notifications
export async function createTrip(req: AuthenticatedRequest, res: Response) {
  const trip = await TripService.create(req.body, req.user!.id);

  // Send real-time notification
  TripSocketIntegration.onTripCreated(
    trip.id,
    trip,
    req.user!.id
  );

  res.json({ success: true, data: trip });
}
```

## Security Considerations

### Authentication

- JWT tokens are validated on every connection
- Expired or invalid tokens are rejected
- User context is attached to each socket connection

### Authorization

- Room access control (future enhancement)
- Admin-only management endpoints
- Rate limiting on socket events (future enhancement)

### Audit Logging

- All connection/disconnection events are logged
- Security violations are tracked
- Performance metrics are collected

## Configuration

### Environment Variables

```env
# Frontend URLs for CORS
FRONTEND_URLS=http://localhost:3000,http://localhost:5173

# JWT configuration (existing)
JWT_SECRET=your-secret-key
JWT_ISSUER=group-planner-api
JWT_AUDIENCE=group-planner-client
```

### Socket.io Configuration

```typescript
const socketConfig = {
  cors: {
    origin: process.env.FRONTEND_URLS?.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1000000, // 1MB
  transports: ['websocket', 'polling']
};
```

## Testing

### Unit Tests

Run Socket.io tests:

```bash
bun test src/tests/socket.test.ts
```

### Integration Testing

1. Start the server: `bun run dev`
2. Use the test endpoints to verify functionality
3. Connect with a WebSocket client for manual testing

### Load Testing

For production readiness, consider testing with:
- Artillery.io for WebSocket load testing
- Multiple concurrent connections
- Message throughput testing

## Monitoring

### Health Checks

- HTTP endpoint: `GET /api/v1/socket/health`
- Returns connection statistics and server status
- Suitable for load balancer health checks

### Metrics

Available through the stats endpoint:
- Total active connections
- Active rooms and member counts
- Connection duration statistics
- Error rates and types

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check JWT token validity and format
2. **CORS Errors**: Verify FRONTEND_URLS environment variable
3. **Room Not Joined**: Ensure user has proper trip access
4. **Memory Leaks**: Monitor connection cleanup in logs

### Debug Logging

Enable debug logs:

```env
LOG_LEVEL=debug
```

### Connection Debugging

Check connection status:

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

## Future Enhancements

### Planned Features

1. **Horizontal Scaling**: Redis adapter for multi-instance deployments
2. **Rate Limiting**: Per-user and per-room message rate limits
3. **Presence System**: Online/offline status tracking
4. **Message History**: Persist and replay recent messages
5. **Typing Indicators**: Real-time typing status
6. **File Sharing**: Real-time file upload notifications

### Performance Optimizations

1. **Connection Pooling**: Efficient resource management
2. **Message Batching**: Reduce network overhead
3. **Compression**: Enable Socket.io compression
4. **CDN Integration**: Serve static assets from CDN

## Dependencies

- `socket.io`: WebSocket server implementation
- `@types/socket.io`: TypeScript definitions
- Existing JWT and auth infrastructure

## Deployment Notes

### Production Checklist

1. Set secure FRONTEND_URLS
2. Enable connection monitoring
3. Configure load balancer sticky sessions (if using clustering)
4. Set up Redis adapter for horizontal scaling
5. Monitor memory usage and connection limits
6. Configure firewall rules for WebSocket ports