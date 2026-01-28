# Group Trip Planner - Project Plan

## Overview
A self-hosted application for coordinating group trips, camping adventures, roadtrips, and similar activities. Enables collaborative planning, item coordination, and schedule management with role-based permissions.

## Technology Stack

### Backend Server
- **Language**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Real-time**: WebSocket (Socket.io)
- **API**: RESTful with real-time endpoints

### Web Frontend
- **Framework**: React
- **State Management**: Redux Toolkit or Zustand
- **UI Library**: Material-UI or Tailwind CSS
- **Build Tool**: Vite
- **HTTP Client**: Axios

### Mobile App
- **Platform**: Android
- **Language**: Kotlin
- **Architecture**: MVVM with Jetpack Compose
- **Networking**: Retrofit
- **Local Storage**: Room Database

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (certbot)
- **Environment**: Self-hosted (Linux server)

## Core Features

### 1. User Management
- User registration and authentication
- Profile management
- Password reset functionality

### 2. Trip Management
- Create new trips with details (name, description, dates, location)
- Trip overview dashboard
- Trip member management
- Trip deletion (host only)

### 3. Permission System
**Host Permissions:**
- Create and modify trip details
- Set recommended item lists
- Set shared/needed item lists
- Approve/reject schedule suggestions
- Manage trip members
- Send trip-wide notifications

**Member Permissions:**
- View trip details and schedules
- Suggest schedule events/places
- Claim shared items
- Add personal notes
- Receive notifications

### 4. Schedule Planning
- Timeline view of trip events
- Event creation with location, time, description
- Member suggestions for events/places
- Host approval workflow for suggestions
- Conflict detection for overlapping events
- Integration with map services for location

### 5. Item Management
**Recommended Items:**
- Host-curated list of suggested personal items
- Categories (clothing, food, gear, etc.)
- Optional vs required flags
- Member checklist functionality

**Shared/Needed Items:**
- Items required for the trip but can be shared
- Quantity needed
- Member claiming system
- Prevent over-claiming
- Unclaimed item alerts

### 6. Notification System
- Real-time notifications for plan changes
- Email notifications (optional)
- Mobile push notifications
- Configurable notification preferences
- Types: schedule changes, new suggestions, item claims, announcements

## Database Schema

### Tables
```sql
users (id, email, username, password_hash, created_at)
trips (id, title, description, start_date, end_date, location, host_id, created_at)
trip_members (trip_id, user_id, role, joined_at)
schedule_events (id, trip_id, title, description, location, start_time, end_time, status, suggested_by, approved_by)
recommended_items (id, trip_id, name, category, required, description)
shared_items (id, trip_id, name, description, quantity_needed, created_by)
shared_item_claims (id, shared_item_id, user_id, quantity, claimed_at)
notifications (id, user_id, trip_id, type, message, read, created_at)
notification_preferences (user_id, email_enabled, push_enabled, schedule_changes, item_updates)
```

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`

### Trips
- `GET /api/trips` - User's trips
- `POST /api/trips` - Create trip
- `GET /api/trips/:id` - Trip details
- `PUT /api/trips/:id` - Update trip (host only)
- `DELETE /api/trips/:id` - Delete trip (host only)
- `POST /api/trips/:id/members` - Add member
- `DELETE /api/trips/:id/members/:userId` - Remove member

### Schedule
- `GET /api/trips/:id/schedule` - Get schedule events
- `POST /api/trips/:id/schedule` - Create/suggest event
- `PUT /api/trips/:id/schedule/:eventId` - Update event
- `POST /api/trips/:id/schedule/:eventId/approve` - Approve suggestion
- `DELETE /api/trips/:id/schedule/:eventId` - Delete event

### Items
- `GET /api/trips/:id/recommended-items` - Get recommended items
- `POST /api/trips/:id/recommended-items` - Add recommended item (host)
- `PUT /api/trips/:id/recommended-items/:itemId` - Update item
- `DELETE /api/trips/:id/recommended-items/:itemId` - Remove item

- `GET /api/trips/:id/shared-items` - Get shared items
- `POST /api/trips/:id/shared-items` - Add shared item
- `POST /api/trips/:id/shared-items/:itemId/claim` - Claim shared item
- `DELETE /api/trips/:id/shared-items/:itemId/claim` - Unclaim item

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/preferences` - Update preferences

## Real-time Features
- Live schedule updates
- Real-time item claiming
- Instant notifications
- Live member activity status

## Security Considerations
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration for web app
- Password hashing with bcrypt
- JWT token expiration and refresh
- SQL injection prevention
- XSS protection

## Self-Hosting Setup

### Requirements
- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose
- Domain name (optional, for SSL)
- Minimum 1GB RAM, 2 CPU cores
- 20GB storage

### Installation
1. Clone repository
2. Configure environment variables
3. Run `docker-compose up -d`
4. Configure nginx reverse proxy
5. Set up SSL certificates
6. Configure backup system

### Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/groupplanner
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
```

## Development Phases

### Phase 1 - Core Backend
- User authentication system
- Trip and member management
- Basic API endpoints
- Database setup

### Phase 2 - Schedule & Items
- Schedule management
- Item list functionality
- Claiming system
- Notification foundation

### Phase 3 - Web Frontend
- React application
- User interface
- Real-time updates
- Responsive design

### Phase 4 - Mobile App
- Android app development
- API integration
- Push notifications
- Offline functionality

### Phase 5 - Deployment & Polish
- Docker containerization
- Self-hosting documentation
- Performance optimization
- Bug fixes and testing

## Testing Strategy
- Unit tests for backend services
- Integration tests for API endpoints
- End-to-end tests for critical flows
- Mobile app testing on multiple devices
- Load testing for concurrent users

## Documentation
- API documentation (OpenAPI/Swagger)
- Self-hosting guide
- User manual
- Developer setup guide
- Troubleshooting guide