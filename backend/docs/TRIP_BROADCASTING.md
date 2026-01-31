# Trip Broadcasting System Documentation

## Overview

The Trip Broadcasting System provides real-time communication and updates for trip-based activities in the Group Planner application. This system enables immediate notification of trip changes, member activities, and other collaborative events to all connected trip participants.

## Architecture

### Core Components

1. **SocketService** - Core Socket.io management with authentication
2. **TripBroadcastService** - High-level broadcasting interface for business logic
3. **Trip Room Management** - Authorization-based room membership
4. **Real-time Event Broadcasting** - Comprehensive event system

### Key Features

- ✅ **JWT-based Authentication** - Secure Socket.io connections
- ✅ **Authorization Validation** - Trip membership verification
- ✅ **Room-based Broadcasting** - Targeted trip member updates
- ✅ **Comprehensive Event Types** - 25+ different broadcast events
- ✅ **Permission-based Updates** - Role-based update permissions
- ✅ **Automatic Cleanup** - Connection and room management
- ✅ **Integration Ready** - Easy integration with existing services

## Usage

### Basic Socket.io Connection (Client-side)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: userJwtToken, // Required for authentication
  },
});

// Listen for connection confirmation
socket.on('connected', (data) => {
  console.log('Connected:', data.message);
});

// Join a trip room
socket.emit('trip:join', { tripId: 'trip-uuid' });

// Listen for trip updates
socket.on('trip:updated', (data) => {
  console.log('Trip updated:', data.updateType, data.payload);
});
```

### Server-side Broadcasting

```typescript
import { TripBroadcastService } from '../services/tripBroadcast.js';

// Broadcast trip details update
TripBroadcastService.broadcastTripUpdate(
  tripId,
  { title: 'New Trip Name', location: updatedLocation },
  { id: userId, username: 'john', email: 'john@example.com' }
);

// Broadcast member addition
TripBroadcastService.broadcastMemberAdded(
  tripId,
  { id: newUserId, username: 'jane', email: 'jane@example.com', role: 'MEMBER' }
);

// Send custom notification
TripBroadcastService.sendCustomNotification(
  tripId,
  {
    type: 'info',
    title: 'Custom Alert',
    message: 'Something important happened!',
    data: { customField: 'value' },
  }
);
```

## Event Types

### Trip Events
- `trip:updated` - Trip details changed (title, description, dates, etc.)
- `trip:deleted` - Trip was deleted
- `trip:member_added` - New member joined
- `trip:member_removed` - Member left or was removed
- `trip:member_role_changed` - Member role updated

### Event Management
- `event:created` - New trip event created
- `event:updated` - Event details modified
- `event:deleted` - Event removed
- `event:rsvp_updated` - RSVP status changed

### Item Management
- `item:created` - New item added to trip
- `item:updated` - Item details changed
- `item:deleted` - Item removed
- `item:assigned` - Item assigned to member
- `item:completed` - Item marked as completed

### Location & Itinerary
- `location:updated` - Trip location changed
- `itinerary:updated` - Trip itinerary modified

### Expenses (Future)
- `expense:created` - New expense added
- `expense:updated` - Expense modified
- `expense:deleted` - Expense removed

### Chat & Communication
- `chat:message` - Chat message sent
- `user:joined` - User joined trip room
- `user:left` - User left trip room
- `user:status` - User online/offline status

## Permission System

### Role-based Update Permissions

| Update Type | HOST | CO_HOST | MEMBER |
|-------------|------|---------|--------|
| Trip details | ✅ | ✅ | ❌ |
| Member management | ✅ | ✅ | ❌ |
| Event creation | ✅ | ✅ | ❌ |
| Event updates | ✅ | ✅ | ❌ |
| Item creation | ✅ | ✅ | ❌ |
| Item assignment | ✅ | ✅ | ✅ |
| Item completion | ✅ | ✅ | ✅ |
| RSVP updates | ✅ | ✅ | ✅ |
| Chat messages | ✅ | ✅ | ✅ |

### Authorization Flow

1. **Socket Authentication** - JWT token validation on connection
2. **Trip Membership Check** - Verify user is confirmed trip member
3. **Permission Validation** - Check role permissions for specific actions
4. **Room Management** - Automatic join/leave based on permissions

## Security Features

### Authentication & Authorization
- JWT token validation on every connection
- Trip membership verification for room access
- Role-based permission checking for updates
- Automatic disconnection of unauthorized users

### Rate Limiting & Abuse Prevention
- Connection rate limiting
- Message frequency controls
- Resource cleanup on disconnect
- Security audit logging

### Data Protection
- No sensitive data in client-side events
- Filtered payload broadcasting
- Audit trail for security events
- IP-based connection tracking

## Integration with Services

### Trip Service Integration

```typescript
// In TripService.updateTrip()
import { socketService } from './socket.js';

// After successful trip update
socketService.broadcastTripDetailsUpdate(
  tripId,
  updateData,
  { id: user.id, username: user.username, email: user.email }
);
```

### Event Service Integration

```typescript
// In EventService.createEvent()
import { TripBroadcastService } from './tripBroadcast.js';

// After event creation
TripBroadcastService.broadcastEventCreated(
  tripId,
  event,
  { id: user.id, username: user.username, email: user.email }
);
```

### Item Service Integration

```typescript
// In ItemService.assignItem()
import { TripBroadcastService } from './tripBroadcast.js';

// After item assignment
TripBroadcastService.broadcastItemAssigned(
  tripId,
  item,
  assignedToUser,
  assignedByUser
);
```

## Monitoring & Statistics

### Room Statistics

```typescript
import { TripBroadcastService } from './tripBroadcast.js';

// Get real-time room stats
const stats = TripBroadcastService.getTripRoomStats(tripId);
console.log(`Active connections: ${stats.activeConnections}`);
console.log(`Connected members:`, stats.members);
```

### Socket Service Statistics

```typescript
import { socketService } from './socket.js';

const globalStats = socketService.getStats();
console.log(`Total connections: ${globalStats.totalConnections}`);
console.log(`Total rooms: ${globalStats.totalRooms}`);
```

## Error Handling

### Common Error Scenarios

1. **Authentication Failures**
   ```
   Error: Authentication token required
   Error: Invalid authentication token
   Error: User not found
   ```

2. **Authorization Failures**
   ```
   Error: Access denied - not a member of this trip
   Error: Insufficient permissions for this update
   ```

3. **Connection Issues**
   ```
   Error: Failed to join trip room
   Error: Failed to broadcast trip update
   ```

### Error Response Format

```typescript
{
  event: string;      // The event that caused the error
  message: string;    // Human-readable error message
  error?: string;     // Error code (e.g., 'FORBIDDEN', 'NOT_FOUND')
}
```

## Performance Considerations

### Scalability Features
- Efficient room membership tracking
- Minimal memory footprint per connection
- Automatic cleanup of inactive connections
- Filtered broadcasting to reduce network overhead

### Resource Management
- Connection pooling and cleanup
- Room-based message targeting
- Lazy room creation and deletion
- Periodic connection health checks

## Testing

### Integration Tests
- Complete integration test suite included
- Authentication flow testing
- Authorization validation
- Broadcasting functionality verification
- Error scenario coverage

### Running Tests

```bash
cd backend
npm test socket-integration.test.ts
```

## Future Enhancements

### Planned Features
- [ ] Message persistence for offline users
- [ ] Push notification integration
- [ ] Advanced presence indicators
- [ ] File sharing notifications
- [ ] Video call coordination
- [ ] Advanced analytics and metrics

### Scalability Improvements
- [ ] Redis adapter for multi-server deployments
- [ ] Message queuing for high-traffic scenarios
- [ ] Connection clustering and load balancing
- [ ] Advanced rate limiting and throttling

## API Reference

### Client Events (Emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `trip:join` | `{ tripId: string }` | Join trip room |
| `trip:leave` | `{ tripId: string }` | Leave trip room |
| `trip:update` | `SocketTripUpdateData` | Broadcast update |
| `ping` | `{}` | Health check |

### Server Events (Listen)

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ message, userId, timestamp }` | Connection confirmed |
| `trip:joined` | `{ tripId, message, timestamp }` | Room join confirmed |
| `trip:left` | `{ tripId, message, timestamp }` | Room leave confirmed |
| `trip:updated` | `{ tripId, updateType, payload, updatedBy?, timestamp }` | Trip update |
| `user:joined` | `{ tripId, user, timestamp }` | User joined room |
| `user:left` | `{ tripId, user, timestamp }` | User left room |
| `user:status` | `{ userId, status, timestamp }` | Online/offline status |
| `notification` | `{ type, title, message, data?, timestamp }` | General notification |
| `error` | `{ event, message, error? }` | Error occurred |

## Support

For technical support or questions about the Trip Broadcasting System:

1. Check the integration tests for usage examples
2. Review the TripBroadcastService interface
3. Examine Socket service logs for debugging
4. Contact the development team for advanced scenarios