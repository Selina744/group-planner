# Group Trip Planner - MVP Plan
*Based on BrownDog's specification with extensibility for future enhancements*

## Overview
A practical, self-hosted group trip planning application that provides essential coordination features while maintaining an architecture that can be extended with advanced functionality. This MVP focuses on core trip planning needs while building a foundation for future growth.

## Core MVP Features

### 1. User Management & Authentication
- Email-based registration and login
- Password reset functionality
- User profiles with basic information
- Secure session management

### 2. Trip Planning & Management
- Create trips with name, description, dates, location
- Invite members via shareable links or email invitations
- Host and member role distinctions
- Trip overview dashboard

### 3. Schedule Coordination
- Timeline-based schedule view
- Add events with title, time, location, description
- Member suggestions for activities and locations
- Host approval workflow for suggested events
- Basic conflict detection for overlapping times

### 4. Item Management System
- **Recommended Items**: Host-curated personal packing lists
- **Shared Items**: Community items with claiming system
- Item categories (food, equipment, safety, etc.)
- Quantity management for shared items
- Personal checklists for members

### 5. Notifications & Communication
- Email notifications for trip updates
- Basic in-app notifications
- Configurable notification preferences
- Trip announcements from hosts

### 6. Self-Hosting Infrastructure
- Docker Compose deployment
- PostgreSQL database with migrations
- Environment-based configuration
- Basic monitoring and health checks
- Automated backup system

## Technology Stack

### Backend (Node.js + TypeScript)
```javascript
Core Framework:
- Express.js with TypeScript
- Prisma ORM for database management
- JWT authentication with refresh tokens
- Express-validator for input validation
- Helmet for security headers

Database:
- PostgreSQL (primary database)
- Redis (session storage and caching)

Communication:
- REST API design
- Socket.io for basic real-time updates
- Nodemailer for email notifications
```

### Frontend (React + TypeScript)
```javascript
Framework:
- React 18 with TypeScript
- React Router for navigation
- React Hook Form for form management
- Axios for HTTP client

UI Framework:
- Material-UI (MUI) for components
- Responsive design for mobile browsers

State Management:
- React Query for server state
- React Context for app state
- Socket.io-client for real-time updates
```

### Mobile (Kotlin Android)
```kotlin
Architecture:
- MVVM with Jetpack Compose
- Retrofit for API communication
- Room Database for offline caching

Notifications:
- Firebase Cloud Messaging for push notifications
- Local notifications for reminders
```

## Extensible Architecture Design

### Database Schema (Future-Proof)
```sql
-- Core tables with extension points
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  profile_data JSONB DEFAULT '{}', -- Extensible profile information
  preferences JSONB DEFAULT '{}', -- Notification and feature preferences
  metadata JSONB DEFAULT '{}', -- Future user metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location JSONB, -- Location data: {address: string, coordinates?: {lat: number, lng: number}, timezone?: string}
  host_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}', -- Trip-specific configuration
  metadata JSONB DEFAULT '{}', -- Future trip data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  title VARCHAR NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location JSONB, -- GeoJSON support
  status VARCHAR DEFAULT 'proposed', -- proposed, approved, cancelled
  suggested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}', -- Future event data (weather, resources, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  type VARCHAR CHECK (type IN ('recommended', 'shared')),
  quantity_needed INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0, -- For future priority systems
  metadata JSONB DEFAULT '{}', -- Cost tracking, vendor info, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extension tables for future features with lifecycle management
CREATE TABLE trip_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  extension_type VARCHAR NOT NULL, -- 'budget', 'weather', 'photos', etc.
  data JSONB NOT NULL,
  version VARCHAR DEFAULT '1.0.0',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, extension_type) -- Prevent duplicate extensions per trip
);

CREATE TABLE user_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  extension_type VARCHAR NOT NULL, -- 'analytics', 'ai_preferences', etc.
  data JSONB NOT NULL,
  version VARCHAR DEFAULT '1.0.0',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, extension_type) -- Prevent duplicate extensions per user
);

-- Schema version tracking for migrations
CREATE TABLE schema_versions (
  version VARCHAR PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  migration_type VARCHAR CHECK (migration_type IN ('core', 'extension', 'plugin')),
  description TEXT
);

-- Extension performance monitoring
CREATE TABLE extension_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_type VARCHAR NOT NULL,
  operation VARCHAR NOT NULL,
  duration_ms INTEGER NOT NULL,
  trip_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for common query patterns
CREATE INDEX idx_trips_host_dates ON trips(host_id, start_date, end_date);
CREATE INDEX idx_items_trip_type ON items(trip_id, type);
CREATE INDEX idx_events_trip_time ON events(trip_id, start_time);
CREATE INDEX idx_extensions_type ON trip_extensions(trip_id, extension_type);
CREATE INDEX idx_user_extensions_type ON user_extensions(user_id, extension_type);
CREATE INDEX idx_extension_performance ON extension_performance(extension_type, created_at);
```

### API Design (Extensible)
```typescript
// Modular API structure
/api/v1/auth/*          // Authentication endpoints
/api/v1/trips/*         // Core trip management
/api/v1/events/*        // Schedule management
/api/v1/items/*         // Item management
/api/v1/notifications/* // Notification system

// Future extension endpoints (planned architecture)
/api/v1/extensions/*    // Plugin/extension management
/api/v1/analytics/*     // Future analytics features
/api/v1/integrations/*  // Third-party integrations
/api/v1/admin/*         // Future admin features

// WebSocket events (extensible)
namespace: /trips/:tripId
events:
  - trip:updated
  - event:created, event:updated, event:deleted
  - item:claimed, item:unclaimed
  - member:joined, member:left
  - notification:new
  // Future: weather:alert, budget:updated, photo:uploaded, etc.
```

### Plugin Architecture Foundation
```javascript
// Plugin system interface (for future implementation)
interface PluginInterface {
  name: string;
  version: string;
  permissions: string[]; // Required permissions array
  initialize(context: SandboxedAppContext): void;
  registerRoutes?(router: ScopedRouter): void;
  registerWebSocketEvents?(io: ScopedSocketServer): void;
  registerDatabaseMigrations?(): SchemaMigration[];
  validateExtensionData?(data: any): ValidationResult;
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
}

// Plugin security sandbox
const createPluginSandbox = (plugin: PluginInterface) => {
  return {
    db: createRestrictedDbAccess(plugin.permissions),
    api: createScopedApiAccess(plugin.permissions),
    storage: createLimitedFileAccess(),
    events: createEventPublisher(plugin.name),
    logger: createPluginLogger(plugin.name)
  };
};

// Extension data validation schemas
interface ExtensionSchema {
  [extensionType: string]: {
    schema: JSONSchema7;
    validator: (data: any) => ValidationResult;
  };
}

const extensionSchemas: ExtensionSchema = {
  budget: {
    schema: { /* JSON Schema for budget data */ },
    validator: (data) => validateBudgetData(data)
  },
  weather: {
    schema: { /* JSON Schema for weather data */ },
    validator: (data) => validateWeatherData(data)
  }
  // Add schemas for each extension type
};

// Configuration system for feature flags
const featureFlags = {
  budgetTracking: process.env.FEATURE_BUDGET === 'true',
  weatherIntegration: process.env.FEATURE_WEATHER === 'true',
  photoManagement: process.env.FEATURE_PHOTOS === 'true',
  analytics: process.env.FEATURE_ANALYTICS === 'true',
  // Add new features as needed
};

// Plugin registration lifecycle
class PluginManager {
  async registerPlugin(plugin: PluginInterface): Promise<void> {
    // 1. Validate plugin structure and permissions
    await this.validatePlugin(plugin);

    // 2. Create sandboxed environment
    const sandbox = createPluginSandbox(plugin);

    // 3. Register database migrations (if any)
    if (plugin.registerDatabaseMigrations) {
      await this.registerMigrations(plugin.registerDatabaseMigrations(), plugin.name);
    }

    // 4. Register API routes (if any)
    if (plugin.registerRoutes) {
      const scopedRouter = this.createScopedRouter(plugin.permissions);
      plugin.registerRoutes(scopedRouter);
    }

    // 5. Register WebSocket events (if any)
    if (plugin.registerWebSocketEvents) {
      const scopedSocketServer = this.createScopedSocketServer(plugin.permissions);
      plugin.registerWebSocketEvents(scopedSocketServer);
    }

    // 6. Initialize plugin in sandbox
    await plugin.initialize(sandbox);

    // 7. Call installation hook
    if (plugin.onInstall) {
      await plugin.onInstall();
    }
  }
}
```

## Development Phases

### Phase 1: Core MVP (8-10 weeks)
**Deliverables:**
- User authentication and registration
- Basic trip creation and management
- Simple schedule planning (add/view events)
- Basic item lists (recommended only)
- Email invitations and notifications
- Docker deployment setup

**Team:** 2 backend developers, 1 frontend developer

### Phase 2: Collaboration Features (4-6 weeks)
**Deliverables:**
- Event suggestions and approval workflow
- Shared item claiming system
- Real-time updates via WebSocket
- Member management
- Basic mobile app

**Team:** +1 mobile developer

### Phase 3: Polish & Extensions (4-6 weeks)
**Deliverables:**
- Enhanced notifications
- Conflict detection
- Admin dashboard
- Performance optimization
- Plugin architecture foundation

**Team:** Existing team + part-time DevOps

## Self-Hosting Requirements

### Minimum System Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Installation Process
```bash
# Clone repository
git clone <repository-url>
cd group-planner

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy with Docker
docker-compose up -d

# Run database migrations
docker-compose exec api npm run migrate

# Create admin user
docker-compose exec api npm run seed:admin
```

### Environment Configuration
```bash
# Core settings
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/planner
JWT_SECRET=your-secure-secret
REDIS_URL=redis://redis:6379

# Email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

# Feature flags (for future use)
FEATURE_BUDGET=false
FEATURE_WEATHER=false
FEATURE_PHOTOS=false
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with secure expiration
- Role-based access control (RBAC) foundation
- Password strength validation
- Comprehensive rate limiting strategy

```javascript
// API Rate Limiting Configuration
const rateLimits = {
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                    // Strict for auth endpoints
    message: "Too many authentication attempts"
  },
  api: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000,                 // Normal for general API
    message: "Too many API requests"
  },
  realtime: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 60,                   // Moderate for WebSocket events
    message: "Too many real-time events"
  },
  extensions: {
    windowMs: 5 * 60 * 1000,   // 5 minutes
    max: 200,                  // Limited for extension endpoints
    message: "Too many extension requests"
  }
};
```

### Data Protection
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection with CSP headers
- HTTPS enforcement in production

### Self-hosting Security
- Environment variable configuration
- Database connection encryption
- Session security
- Regular dependency updates

## Monitoring & Maintenance

### Health Checks
- API endpoint health monitoring
- Database connection validation
- Redis connectivity checks
- WebSocket connection status

### Logging
- Structured application logging
- Error tracking and alerting
- Access logs for security
- Performance monitoring

### Backup Strategy
- Daily automated database backups
- Configuration file backups
- Simple restore documentation

## Future Extensibility Notes

### Database Design Considerations
- JSON columns for flexible data storage
- Extensible table structure
- Foreign key constraints for data integrity
- Audit trail capability (created_at, updated_at)

### API Versioning Strategy
- Semantic versioning for API endpoints
- Backward compatibility maintenance
- Extension endpoint namespacing
- Plugin registration system

### Configuration Management
- Feature flag system for gradual rollouts
- Environment-based configuration
- Plugin configuration support
- Runtime configuration updates

### Performance Considerations
- Database indexing strategy
- Caching layer implementation
- Query optimization paths
- Asset optimization pipeline

### Enterprise Migration Path
*Gradual evolution from single-tenant MVP to enterprise platform*

#### Phase 1: Multi-user Foundation (Current MVP)
- Single-tenant architecture
- Basic role-based permissions
- User and trip isolation through application logic

#### Phase 2: Organization Structure
```sql
-- Add organization support without breaking changes
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE trips ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Migrate existing data to default organization
INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), 'Default Organization');
UPDATE users SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization');
UPDATE trips SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization');
```

#### Phase 3: Row-Level Security
```sql
-- Enable row-level security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policies for organization isolation
CREATE POLICY trips_org_isolation ON trips
  FOR ALL TO authenticated_users
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

#### Phase 4: SSO Integration
- SAML/OAuth provider integration
- Directory service synchronization
- Enterprise authentication flows
- Gradual migration from JWT-only to hybrid auth

#### Phase 5: Advanced Enterprise Features
- Department hierarchies
- Advanced audit logging
- Compliance features (GDPR, SOC2)
- Enterprise analytics and reporting

### Location Data Model
*Standardized location format for future weather and mapping features*

```typescript
interface LocationData {
  // Required fields
  address: string;                    // Human-readable address

  // Optional but recommended
  coordinates?: {
    lat: number;                      // Latitude
    lng: number;                      // Longitude
  };

  // Enhancement fields for future features
  timezone?: string;                  // IANA timezone identifier
  country?: string;                   // ISO country code
  region?: string;                    // State/province/region
  city?: string;                      // City name
  postalCode?: string;               // Postal/ZIP code

  // Future extension point
  metadata?: {
    elevation?: number;               // Elevation in meters
    accuracy?: number;                // GPS accuracy in meters
    source?: 'user_input' | 'gps' | 'geocoded';
  };
}
```

This standardized format prepares the MVP for seamless integration with weather APIs, mapping services, and route planning features without requiring database migrations.

This MVP provides a solid foundation that can grow into either HazyBear's microservices architecture or EmeraldOwl's enterprise platform while maintaining the simplicity and self-hosting focus that makes it accessible to casual users.