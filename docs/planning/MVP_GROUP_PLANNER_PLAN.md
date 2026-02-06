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

### Mobile (React Native)
```javascript
Cross-Platform Framework:
- React Native with TypeScript
- React Navigation for app navigation
- React Query for server state management
- AsyncStorage for local data persistence

API Integration:
- Axios for HTTP requests
- WebSocket client for real-time updates
- Background fetch for data synchronization

UI Framework:
- React Native Paper or NativeBase for components
- Responsive design for tablets and phones
- Platform-specific adaptations (iOS/Android)

Notifications:
- Firebase Cloud Messaging for push notifications
- React Native Push Notification for local notifications
- Background notification handling

State Management:
- Redux Toolkit or Zustand for app state
- React Context for theme and user preferences
- Offline-first architecture with data sync

Platform Features:
- Camera integration for photo capture
- GPS location services
- Biometric authentication support
- Deep linking for trip invitations

Performance Considerations:
- GPS-intensive features may require native optimization
- Consider native modules for location tracking in future updates
- Battery optimization for background location services
- Platform-specific permissions handling (iOS vs Android)
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

## Plugin System Architecture

The Group Trip Planner features a comprehensive plugin system that allows extending core functionality without modifying the base application. This system provides secure, sandboxed execution environments for third-party extensions while maintaining data integrity and system stability.

### Conceptual Overview

The plugin system works by providing **extension points** throughout the application where plugins can hook into core functionality. Plugins operate in **sandboxed environments** with limited, permission-based access to system resources.

**Key Principles:**
- **Secure by Default**: Plugins have no access unless explicitly granted
- **Data Integrity**: All plugin data is validated and isolated
- **Non-Breaking**: Plugins cannot interfere with core functionality
- **Discoverable**: Clear extension points and APIs
- **Manageable**: Install, update, disable, and remove plugins safely

### Plugin Structure & Interface

Every plugin implements a standardized interface that defines its capabilities and requirements:

```typescript
interface PluginInterface {
  // Plugin Identity
  name: string;                    // Unique plugin identifier
  displayName: string;             // Human-readable name
  version: string;                 // Semantic version (e.g., "1.2.3")
  description: string;             // Brief description of functionality
  author: string;                  // Plugin author/organization

  // System Requirements
  minAppVersion: string;           // Minimum app version required
  permissions: PluginPermission[]; // Required permissions array
  dependencies: string[];          // Other required plugins

  // Lifecycle Hooks
  onInstall?(): Promise<void>;           // Called during installation
  onUninstall?(): Promise<void>;         // Called during removal
  onEnable?(): Promise<void>;            // Called when plugin is enabled
  onDisable?(): Promise<void>;           // Called when plugin is disabled
  initialize(context: PluginContext): Promise<void>; // Main initialization

  // Extension Points
  registerRoutes?(router: ScopedRouter): void;
  registerWebSocketEvents?(io: ScopedSocketServer): void;
  registerDatabaseMigrations?(): SchemaMigration[];
  registerNotificationTypes?(): NotificationType[];
  registerUIComponents?(): UIComponent[];

  // Data Validation
  validateExtensionData?(type: string, data: any): ValidationResult;

  // Configuration
  getConfigSchema?(): ConfigurationSchema;
  validateConfig?(config: any): boolean;
}

// Permission system for granular access control
enum PluginPermission {
  // Database Access
  READ_TRIPS = 'database.trips.read',
  WRITE_TRIPS = 'database.trips.write',
  READ_USERS = 'database.users.read',
  READ_EVENTS = 'database.events.read',
  WRITE_EVENTS = 'database.events.write',
  READ_ITEMS = 'database.items.read',
  WRITE_ITEMS = 'database.items.write',

  // Extension Data
  READ_EXTENSIONS = 'extensions.read',
  WRITE_EXTENSIONS = 'extensions.write',

  // External APIs
  HTTP_REQUESTS = 'network.http',
  WEBHOOK_RECEIVE = 'network.webhooks',

  // File System
  READ_FILES = 'storage.read',
  WRITE_FILES = 'storage.write',

  // System
  SEND_NOTIFICATIONS = 'system.notifications',
  SCHEDULE_TASKS = 'system.scheduler',
  ACCESS_LOGS = 'system.logs'
}
```

### Plugin Lifecycle Management

Plugins go through a defined lifecycle managed by the PluginManager:

```typescript
class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private contexts = new Map<string, PluginContext>();

  // Plugin Installation Process
  async installPlugin(pluginPackage: PluginPackage): Promise<void> {
    // 1. Validation Phase
    await this.validatePluginPackage(pluginPackage);
    await this.checkDependencies(pluginPackage.manifest.dependencies);
    await this.verifyPermissions(pluginPackage.manifest.permissions);

    // 2. Security Scan
    await this.scanPluginCode(pluginPackage.code);

    // 3. Database Preparation
    if (pluginPackage.manifest.registerDatabaseMigrations) {
      await this.prepareDatabaseMigrations(pluginPackage);
    }

    // 4. Sandbox Creation
    const context = await this.createPluginContext(pluginPackage.manifest);

    // 5. Plugin Registration
    const plugin = await this.loadPlugin(pluginPackage, context);

    // 6. Installation Hook
    if (plugin.onInstall) {
      await plugin.onInstall();
    }

    // 7. Enable if auto-enable is set
    if (pluginPackage.manifest.autoEnable !== false) {
      await this.enablePlugin(plugin.name);
    }

    this.plugins.set(plugin.name, { plugin, context, enabled: false });
  }

  // Plugin Enabling Process
  async enablePlugin(pluginName: string): Promise<void> {
    const loadedPlugin = this.plugins.get(pluginName);
    if (!loadedPlugin || loadedPlugin.enabled) return;

    // 1. Run database migrations
    if (loadedPlugin.plugin.registerDatabaseMigrations) {
      await this.runMigrations(loadedPlugin.plugin.registerDatabaseMigrations());
    }

    // 2. Register routes and events
    await this.registerPluginExtensionPoints(loadedPlugin.plugin);

    // 3. Initialize plugin
    await loadedPlugin.plugin.initialize(loadedPlugin.context);

    // 4. Call enable hook
    if (loadedPlugin.plugin.onEnable) {
      await loadedPlugin.plugin.onEnable();
    }

    // 5. Mark as enabled
    loadedPlugin.enabled = true;

    // 6. Update plugin registry
    await this.updatePluginStatus(pluginName, 'enabled');
  }
}
```

### Security & Sandboxing

The plugin system implements comprehensive security through sandboxed execution environments:

```typescript
interface PluginContext {
  // Restricted database access based on permissions
  database: SandboxedDatabase;

  // Scoped API access
  api: ScopedApiClient;

  // File storage with quotas
  storage: SandboxedStorage;

  // Event system for plugin communication
  events: PluginEventEmitter;

  // Logging with plugin identification
  logger: PluginLogger;

  // Configuration management
  config: PluginConfigManager;

  // HTTP client for external APIs (if permitted)
  http?: HttpClient;

  // Scheduler for background tasks (if permitted)
  scheduler?: TaskScheduler;
}

class SandboxedDatabase {
  constructor(private permissions: PluginPermission[]) {}

  // Only allow queries based on granted permissions
  async findTrips(criteria: TripQuery): Promise<Trip[]> {
    this.requirePermission(PluginPermission.READ_TRIPS);

    // Apply row-level security filters
    const filteredCriteria = this.applySecurityFilters(criteria);
    return this.executeQuery('trips', filteredCriteria);
  }

  async createExtension(tripId: string, type: string, data: any): Promise<void> {
    this.requirePermission(PluginPermission.WRITE_EXTENSIONS);

    // Validate data against extension schema
    await this.validateExtensionData(type, data);

    // Ensure plugin can only create extensions of types it owns
    this.ensureExtensionOwnership(type);

    return this.executeInsert('trip_extensions', {
      trip_id: tripId,
      extension_type: type,
      data,
      created_by_plugin: this.pluginName
    });
  }
}
```

### Extension Points

Plugins can extend the application at well-defined extension points:

#### 1. Database Extensions
```typescript
// Store custom data associated with trips, users, events, or items
await context.database.createExtension('trip_123', 'budget_tracking', {
  totalBudget: 5000,
  categories: ['food', 'lodging', 'transport'],
  expenses: []
});
```

#### 2. API Route Extensions
```typescript
// Add custom API endpoints
function registerRoutes(router: ScopedRouter) {
  // GET /api/v1/plugins/budget/trips/:tripId/summary
  router.get('/trips/:tripId/summary', async (req, res) => {
    const tripId = req.params.tripId;
    const budgetData = await context.database.getExtension(tripId, 'budget_tracking');

    const summary = calculateBudgetSummary(budgetData);
    res.json(summary);
  });

  // POST /api/v1/plugins/budget/trips/:tripId/expenses
  router.post('/trips/:tripId/expenses', async (req, res) => {
    await addExpense(req.params.tripId, req.body);
    res.json({ success: true });
  });
}
```

#### 3. Real-time Event Extensions
```typescript
// Listen to and emit custom WebSocket events
function registerWebSocketEvents(io: ScopedSocketServer) {
  // Listen to core events
  io.on('item:claimed', async (data) => {
    if (await shouldTrackExpense(data.itemId)) {
      await createExpenseEntry(data);

      // Emit custom event
      io.emit('budget:expense:created', {
        tripId: data.tripId,
        amount: data.estimatedCost
      });
    }
  });

  // Handle plugin-specific events
  io.on('budget:expense:add', async (data) => {
    await addExpense(data.tripId, data.expense);
  });
}
```

#### 4. Notification Extensions
```typescript
// Register custom notification types
function registerNotificationTypes(): NotificationType[] {
  return [
    {
      type: 'budget_limit_exceeded',
      displayName: 'Budget Limit Exceeded',
      description: 'Sent when trip expenses exceed the set budget',
      defaultEnabled: true,
      channels: ['email', 'push', 'in_app']
    },
    {
      type: 'expense_settlement_reminder',
      displayName: 'Settlement Reminder',
      description: 'Reminds users to settle outstanding expenses',
      defaultEnabled: false,
      channels: ['email', 'in_app']
    }
  ];
}
```

#### 5. UI Component Extensions
```typescript
// Register custom frontend components
function registerUIComponents(): UIComponent[] {
  return [
    {
      type: 'trip_tab',
      name: 'Budget',
      component: 'BudgetTab',
      icon: 'DollarSign',
      order: 3,
      requiredPermissions: ['budget.view']
    },
    {
      type: 'dashboard_widget',
      name: 'Budget Summary',
      component: 'BudgetWidget',
      defaultSize: { width: 2, height: 1 }
    }
  ];
}
```

### Configuration Management

Plugins can define configuration schemas and manage settings:

```typescript
function getConfigSchema(): ConfigurationSchema {
  return {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        enum: ['USD', 'EUR', 'GBP', 'CAD'],
        default: 'USD',
        title: 'Default Currency'
      },
      autoCreateBudgetCategories: {
        type: 'boolean',
        default: true,
        title: 'Auto-create Budget Categories',
        description: 'Automatically create budget categories based on item types'
      },
      expenseApprovalRequired: {
        type: 'boolean',
        default: false,
        title: 'Require Expense Approval',
        description: 'Require trip host approval for expenses over threshold'
      },
      approvalThreshold: {
        type: 'number',
        minimum: 0,
        default: 100,
        title: 'Approval Threshold',
        condition: { field: 'expenseApprovalRequired', value: true }
      }
    },
    required: ['currency']
  };
}

// Access configuration in plugin code
const config = await context.config.get();
const currency = config.currency || 'USD';
```

### Plugin Development Workflow

#### 1. Plugin Package Structure
```
my-budget-plugin/
├── package.json          # Plugin metadata and dependencies
├── manifest.json         # Plugin manifest with permissions
├── src/
│   ├── index.ts          # Main plugin entry point
│   ├── database/
│   │   └── migrations.ts # Database migrations
│   ├── routes/
│   │   └── expenses.ts   # API route handlers
│   └── events/
│       └── handlers.ts   # Event handlers
├── frontend/
│   ├── components/       # React components
│   └── hooks/           # Custom hooks
└── docs/
    └── README.md        # Plugin documentation
```

#### 2. Plugin Manifest
```json
{
  "name": "budget-tracker",
  "displayName": "Budget Tracker",
  "version": "1.0.0",
  "description": "Track trip expenses and manage budgets",
  "author": "Trip Planner Team",
  "minAppVersion": "1.0.0",
  "permissions": [
    "database.trips.read",
    "database.items.read",
    "extensions.read",
    "extensions.write",
    "system.notifications"
  ],
  "dependencies": [],
  "autoEnable": true,
  "extensionTypes": ["budget_tracking", "expense_data"],
  "apiRoutes": ["/budget/*"],
  "webSocketEvents": ["budget:*"],
  "uiComponents": ["BudgetTab", "BudgetWidget"]
}
```

#### 3. Development & Testing
```bash
# Plugin development commands
npm run plugin:create my-budget-plugin
npm run plugin:develop my-budget-plugin  # Hot reload during development
npm run plugin:test my-budget-plugin     # Run plugin tests
npm run plugin:build my-budget-plugin    # Build for distribution
npm run plugin:package my-budget-plugin  # Create plugin package

# Plugin management commands
npm run plugin:install budget-tracker-1.0.0.tgz
npm run plugin:enable budget-tracker
npm run plugin:disable budget-tracker
npm run plugin:uninstall budget-tracker
```

### Plugin Examples

#### Simple Weather Plugin
```typescript
class WeatherPlugin implements PluginInterface {
  name = 'weather-alerts';
  displayName = 'Weather Alerts';
  version = '1.0.0';
  permissions = [PluginPermission.READ_TRIPS, PluginPermission.HTTP_REQUESTS];

  async initialize(context: PluginContext) {
    // Schedule daily weather checks
    context.scheduler.schedule('0 8 * * *', () => this.checkWeatherAlerts(context));
  }

  private async checkWeatherAlerts(context: PluginContext) {
    const upcomingTrips = await context.database.findTrips({
      startDate: { gte: new Date(), lte: addDays(new Date(), 7) }
    });

    for (const trip of upcomingTrips) {
      if (trip.location?.coordinates) {
        const weather = await this.fetchWeatherForecast(trip.location.coordinates);

        if (weather.alerts.length > 0) {
          await context.events.emit('weather:alert', {
            tripId: trip.id,
            alerts: weather.alerts
          });
        }
      }
    }
  }
}
```

This comprehensive plugin system provides a secure, extensible foundation for adding advanced features to the Group Trip Planner while maintaining system stability and security.

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
- Basic React Native mobile app (iOS & Android)

**Team:** +1 React Native developer

### Phase 3: Polish & Extensions (4-6 weeks)
**Deliverables:**
- Enhanced notifications
- Conflict detection
- Admin dashboard
- Performance optimization
- Plugin architecture foundation

**Team:** Existing team + part-time DevOps

## React Native Development Setup

For developers working on the mobile application, additional toolchain setup is required:

### iOS Development Environment
```bash
# macOS required for iOS development
# Install Xcode from Mac App Store (12.0 minimum)

# Install iOS Simulator and development tools
xcode-select --install

# Install CocoaPods for native dependency management
sudo gem install cocoapods

# Clone project and setup mobile app
git clone https://github.com/Selina744/group-planner.git
cd group-planner/mobile

# Install dependencies
npm install

# Install iOS native dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# In another terminal, run iOS simulator
npm run ios
```

### Android Development Environment
```bash
# Install Android Studio
# Download from https://developer.android.com/studio

# Install Java Development Kit 17
# macOS:
brew install openjdk@17

# Ubuntu:
sudo apt install openjdk-17-jdk

# Windows:
# Download from https://adoptium.net/

# Set environment variables (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Clone and setup (if not already done)
git clone https://github.com/Selina744/group-planner.git
cd group-planner/mobile

# Install dependencies
npm install

# Start Metro bundler
npm start

# In another terminal, run Android emulator
npm run android
```

### Development Workflow
```bash
# Start backend API (required for mobile app)
cd backend
npm run dev

# In another terminal, start React Native
cd mobile
npm start

# Development commands
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run ios:device   # Run on physical iOS device
npm run android:device  # Run on physical Android device

# Testing
npm run test         # Run unit tests
npm run e2e:ios     # End-to-end tests on iOS
npm run e2e:android # End-to-end tests on Android

# Build for production
npm run build:ios    # Build iOS .ipa
npm run build:android # Build Android .apk/.aab
```

### Common Development Issues & Solutions

#### iOS Issues
```bash
# If iOS build fails with CocoaPods errors
cd ios && rm -rf Pods Podfile.lock && pod install

# If Metro cache issues occur
npm start -- --reset-cache

# Clear Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

#### Android Issues
```bash
# If Android build fails
cd android && ./gradlew clean && cd ..
npm run android

# Clear Metro and Android caches
npm start -- --reset-cache
cd android && ./gradlew clean && cd ..

# Reset ADB if device connection issues
adb kill-server && adb start-server
```

#### Metro Bundler Issues
```bash
# Clear all caches
npm start -- --reset-cache
rm -rf node_modules && npm install
cd ios && rm -rf Pods && pod install && cd ..
cd android && ./gradlew clean && cd ..
```

## Self-Hosting & Deployment Options

The Group Trip Planner offers multiple deployment options to suit different technical environments and preferences. Choose the method that best fits your infrastructure and technical expertise.

### System Requirements

#### Minimum Requirements (Docker)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Linux, Windows 10+, macOS 10.14+

#### Recommended Requirements (Docker)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Linux (Ubuntu 22.04 LTS), Windows 11, macOS 12+

#### Native Installation Requirements
- **CPU**: 2+ cores
- **RAM**: 8GB (for development dependencies)
- **Storage**: 30GB
- **OS**: Windows 10+, Linux (Ubuntu 20.04+), macOS 10.15+
- **Node.js**: 18.x or 20.x
- **PostgreSQL**: 13+
- **Redis**: 6+

#### React Native Development Prerequisites

**For iOS Development:**
- macOS 10.15.7+ required
- Xcode 12.0+ (latest recommended)
- iOS Simulator
- Apple Developer Account (for device testing)
- CocoaPods dependency manager

**For Android Development:**
- Android Studio with Android SDK
- Java Development Kit (JDK) 17+
- Android device or emulator
- Google Play Developer Account (for distribution)

#### Deployment Method Decision Table

| Factor | Docker (Recommended) | Native Installation |
|--------|---------------------|---------------------|
| **Setup Time** | 15-30 minutes | 1-3 hours |
| **Technical Expertise** | Basic Docker knowledge | System administration |
| **Maintenance** | Simple updates via images | Manual dependency management |
| **Customization** | Limited to environment variables | Full source code access |
| **Resource Usage** | Slightly higher (containers) | Direct OS resource access |
| **Isolation** | Complete service isolation | Shared OS dependencies |
| **Backup/Restore** | Container volumes | Manual file management |
| **Production Ready** | Yes (with proper configuration) | Requires additional setup |
| **Multi-environment** | Excellent (dev/staging/prod) | Environment-specific setup |
| **Troubleshooting** | Container logs and health checks | Direct system access |

**Recommendation:** Use Docker for most installations unless you need extensive customization or have specific infrastructure requirements.

## Deployment Methods

### Option 1: Docker Registry (Recommended)

The simplest deployment method using pre-built images from Docker registry.

#### Quick Start
```bash
# Create project directory
mkdir group-planner && cd group-planner

# Download configuration files
curl -O https://raw.githubusercontent.com/Selina744/group-planner/master/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/Selina744/group-planner/master/.env.example

# Configure environment
cp .env.example .env
# Edit .env with your settings (see Environment Configuration below)

# Deploy with pre-built images
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec api npm run migrate
docker-compose exec api npm run seed:admin
```

#### Docker Compose (Production)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  web:
    image: groupplanner/web:latest
    restart: unless-stopped
    depends_on:
      - api
    environment:
      - REACT_APP_API_URL=http://localhost:3001/api/v1

  api:
    image: groupplanner/api:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
      - api

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Build from Source

For developers and those who want to customize the application.

```bash
# Clone repository
git clone https://github.com/Selina744/group-planner.git
cd group-planner

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and deploy
docker-compose up --build -d

# Initialize database
docker-compose exec api npm run migrate
docker-compose exec api npm run seed:admin
```

### Option 3: Native Installation

Direct installation on the host operating system without Docker.

#### Linux (Ubuntu/Debian)
```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/Selina744/group-planner.git
cd group-planner

# Install backend dependencies
cd backend
npm install
npm run build

# Install frontend dependencies
cd ../frontend
npm install
npm run build

# Setup database
sudo -u postgres createuser planner
sudo -u postgres createdb group_planner
sudo -u postgres psql -c "ALTER USER planner PASSWORD 'secure_password';"

# Configure environment
cp .env.example .env
# Edit .env with database credentials

# Run migrations
npm run migrate

# Start services
cd ../backend
npm start &

# Setup nginx (see nginx configuration below)
sudo cp nginx.conf /etc/nginx/sites-available/group-planner
sudo ln -s /etc/nginx/sites-available/group-planner /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

#### macOS
```bash
# Install dependencies with Homebrew
brew install node@20 postgresql@15 redis nginx

# Start services
brew services start postgresql@15
brew services start redis

# Clone and setup (same as Linux)
git clone https://github.com/Selina744/group-planner.git
cd group-planner

# Backend setup
cd backend
npm install
npm run build

# Frontend setup
cd ../frontend
npm install
npm run build

# Database setup
createuser planner
createdb group_planner
psql -c "ALTER USER planner PASSWORD 'secure_password';"

# Configure and run (same as Linux)
cp .env.example .env
# Edit .env with settings
npm run migrate
npm start
```

#### Windows
```powershell
# Install Node.js 20.x from https://nodejs.org/
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Install Redis from https://github.com/microsoftarchive/redis/releases

# Clone repository
git clone https://github.com/Selina744/group-planner.git
cd group-planner

# Backend setup
cd backend
npm install
npm run build

# Frontend setup
cd ..\frontend
npm install
npm run build

# Database setup (in PostgreSQL command line)
CREATE USER planner WITH PASSWORD 'secure_password';
CREATE DATABASE group_planner OWNER planner;

# Configure environment
copy .env.example .env
# Edit .env with your settings

# Run application
cd ..\backend
npm run migrate
npm start
```

## Publishing to Docker Registry

For organizations wanting to distribute their customized version:

### Build and Push Images
```bash
# Build images
docker build -t yourusername/group-planner-api:latest ./backend
docker build -t yourusername/group-planner-web:latest ./frontend

# Tag for version
docker tag yourusername/group-planner-api:latest yourusername/group-planner-api:v1.0.0
docker tag yourusername/group-planner-web:latest yourusername/group-planner-web:v1.0.0

# Push to Docker Hub
docker push yourusername/group-planner-api:latest
docker push yourusername/group-planner-api:v1.0.0
docker push yourusername/group-planner-web:latest
docker push yourusername/group-planner-web:v1.0.0
```

### Multi-Architecture Builds
```bash
# Setup buildx for multi-platform builds
docker buildx create --use --name multiarch

# Build and push for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t yourusername/group-planner-api:latest \
  --push ./backend

docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t yourusername/group-planner-web:latest \
  --push ./frontend
```

### Private Registry Deployment
```bash
# For private registries (GitLab, AWS ECR, etc.)
docker tag group-planner-api:latest registry.company.com/group-planner/api:latest
docker push registry.company.com/group-planner/api:latest

# Update docker-compose.prod.yml to use private registry
# image: registry.company.com/group-planner/api:latest
```

## Environment Configuration

### Core Settings
```bash
# Application Settings
NODE_ENV=production
APP_PORT=3001
APP_URL=https://your-domain.com

# Database Configuration
DATABASE_URL=postgresql://planner:secure_password@postgres:5432/group_planner
DB_NAME=group_planner
DB_USER=planner
DB_PASSWORD=secure_password
DB_HOST=postgres
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_ROUNDS=12

# Email Configuration (Required for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Group Trip Planner <noreply@your-domain.com>

# File Upload (if using local storage)
UPLOAD_PATH=/uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Feature Flags
FEATURE_BUDGET=false
FEATURE_WEATHER=false
FEATURE_PHOTOS=false
FEATURE_ANALYTICS=false

# Plugin System
PLUGIN_DIR=/plugins
PLUGIN_REGISTRY_URL=https://plugins.group-planner.com
ENABLE_PLUGIN_MARKETPLACE=false

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_METRICS=true
HEALTH_CHECK_ENDPOINT=/api/v1/health

# SSL Configuration (for production)
SSL_CERT_PATH=/etc/ssl/certs/your-domain.crt
SSL_KEY_PATH=/etc/ssl/private/your-domain.key
```

### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/your-domain.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend (React app)
    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Origin "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'; frame-ancestors 'self';" always;
}
```

## Deployment Verification

After installation, verify the deployment is working correctly:

```bash
# Check service status
docker-compose ps  # For Docker deployments

# Test API health check
curl http://localhost:3001/api/v1/health

# Check database connectivity
docker-compose exec postgres pg_isready

# View application logs
docker-compose logs api
docker-compose logs web

# Monitor resource usage
docker stats
```

## Maintenance & Updates

### Docker Registry Updates (Zero-Downtime)

#### Pre-Update Backup
```bash
# Create backup directory with timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$BACKUP_DATE

# Backup database
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > backups/$BACKUP_DATE/database.sql

# Backup environment configuration
cp .env backups/$BACKUP_DATE/
cp docker-compose.prod.yml backups/$BACKUP_DATE/

# Backup file uploads (if any)
docker run --rm -v group-planner_uploads:/source -v $(pwd)/backups/$BACKUP_DATE:/backup alpine tar czf /backup/uploads.tar.gz -C /source .

echo "Backup created in backups/$BACKUP_DATE"
```

#### Zero-Downtime Update Process
```bash
# 1. Pull latest images (no downtime)
docker-compose -f docker-compose.prod.yml pull

# 2. Update web service first (frontend can handle API downtime briefly)
docker-compose -f docker-compose.prod.yml up -d --no-deps web

# 3. Check web service health
docker-compose -f docker-compose.prod.yml ps web

# 4. Update API service (most critical step)
docker-compose -f docker-compose.prod.yml up -d --no-deps api

# 5. Wait for API health check to pass
./scripts/wait-for-health.sh http://localhost:3001/api/v1/health

# 6. Run database migrations if needed
docker-compose exec api npm run migrate

# 7. Verify full system health
curl -f http://localhost:3001/api/v1/health
curl -f http://localhost/

# 8. Clean up old images
docker image prune -f
```

#### Rollback Procedure
```bash
# If update fails, rollback to previous version
BACKUP_DATE=20241128_143022  # Replace with your backup date

# 1. Stop current services
docker-compose -f docker-compose.prod.yml down

# 2. Restore database
docker-compose up -d postgres redis
sleep 10  # Wait for database to start
docker-compose exec postgres psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME"
docker-compose exec postgres psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME"
cat backups/$BACKUP_DATE/database.sql | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

# 3. Restore configuration
cp backups/$BACKUP_DATE/.env ./
cp backups/$BACKUP_DATE/docker-compose.prod.yml ./

# 4. Restore file uploads
docker run --rm -v group-planner_uploads:/target -v $(pwd)/backups/$BACKUP_DATE:/backup alpine tar xzf /backup/uploads.tar.gz -C /target

# 5. Start services with previous configuration
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify rollback success
./scripts/verify-rollback.sh
```

### Native Installation Updates

#### Pre-Update Backup
```bash
# Create backup directory
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$BACKUP_DATE

# Backup database
pg_dump -U planner group_planner > backups/$BACKUP_DATE/database.sql

# Backup current code and configuration
tar czf backups/$BACKUP_DATE/application.tar.gz --exclude=node_modules --exclude=.git .

# Backup environment configuration
cp .env backups/$BACKUP_DATE/
cp -r uploads/ backups/$BACKUP_DATE/ 2>/dev/null || true

echo "Backup created in backups/$BACKUP_DATE"
```

#### Update Process with Rollback Safety
```bash
# 1. Create backup (see above)
./scripts/backup.sh

# 2. Create temporary branch for current state
git add .
git commit -m "Pre-update backup commit" || true
git tag "backup-$BACKUP_DATE"

# 3. Pull latest code
git stash  # Stash any local changes
git pull origin main

# 4. Update backend with health check
cd backend
npm install
npm run build

# Test build before migrations
npm run test:health || {
    echo "Build failed, rolling back..."
    git reset --hard "backup-$BACKUP_DATE"
    npm install
    npm run build
    exit 1
}

# 5. Run migrations with backup
npm run migrate

# 6. Update frontend
cd ../frontend
npm install
npm run build

# 7. Restart services gracefully
if command -v systemctl > /dev/null; then
    sudo systemctl reload group-planner  # Graceful reload
    sleep 5
    sudo systemctl status group-planner
else
    # Manual restart
    pkill -f "node.*group-planner"
    nohup npm start > logs/app.log 2>&1 &
fi

# 8. Verify update success
./scripts/verify-health.sh || {
    echo "Health check failed, initiating rollback..."
    ./scripts/rollback.sh $BACKUP_DATE
}
```

#### Native Installation Rollback
```bash
# Usage: ./scripts/rollback.sh BACKUP_DATE
BACKUP_DATE=${1:-$(ls -t backups/ | head -1)}

echo "Rolling back to backup: $BACKUP_DATE"

# 1. Stop services
if command -v systemctl > /dev/null; then
    sudo systemctl stop group-planner
else
    pkill -f "node.*group-planner"
fi

# 2. Restore database
dropdb group_planner
createdb group_planner
psql -U planner group_planner < backups/$BACKUP_DATE/database.sql

# 3. Restore application code
rm -rf backend/dist frontend/dist
tar xzf backups/$BACKUP_DATE/application.tar.gz

# 4. Restore configuration and uploads
cp backups/$BACKUP_DATE/.env ./
cp -r backups/$BACKUP_DATE/uploads/ ./ 2>/dev/null || true

# 5. Rebuild with previous version
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build

# 6. Restart services
if command -v systemctl > /dev/null; then
    sudo systemctl start group-planner
    sudo systemctl status group-planner
else
    nohup npm start > logs/app.log 2>&1 &
fi

# 7. Reset git to backup state
git reset --hard "backup-$BACKUP_DATE"

echo "Rollback completed. Verify functionality at http://localhost"
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