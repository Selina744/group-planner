# Package Documentation

This document provides comprehensive documentation of all packages used in the Group Planner Backend project, organized by category with explanations of their purpose and usage.

## 🏗️ Core Framework & Runtime

### **express** `^4.18.0`
**Purpose**: Web application framework for Node.js
**Why**: Provides the foundation for our REST API server, routing, middleware system, and HTTP request/response handling. Express is the de facto standard for Node.js web servers.

### **dotenv** `^16.3.1`
**Purpose**: Environment variable management
**Why**: Loads environment variables from `.env` files into `process.env`, essential for configuration management, API keys, database URLs, and environment-specific settings.

## 🔐 Authentication & Security

### **bcrypt** `^6.0.0`
**Purpose**: Password hashing library
**Why**: Provides secure password hashing using bcrypt algorithm. Essential for storing user passwords safely with salt and multiple rounds of hashing.

### **jsonwebtoken** `^9.0.3`
**Purpose**: JWT token generation and verification
**Why**: Implements JSON Web Token authentication for stateless user sessions. Used for access tokens and refresh tokens in our authentication system.

### **helmet** `^7.1.0`
**Purpose**: Security middleware collection
**Why**: Sets various HTTP headers to secure the app against common web vulnerabilities (XSS, clickjacking, etc.). Essential for production security.

### **cors** `^2.8.5`
**Purpose**: Cross-Origin Resource Sharing middleware
**Why**: Enables controlled access from frontend applications running on different domains. Configures CORS policies for our API endpoints.

### **cookie-parser** `^1.4.7`
**Purpose**: HTTP cookie parsing middleware
**Why**: Parses cookies from HTTP requests, used for secure authentication token storage and session management.

## 🛡️ Rate Limiting & Performance Protection

### **express-rate-limit** `^7.1.0`
**Purpose**: Rate limiting middleware
**Why**: Protects API endpoints from abuse by limiting the number of requests per IP address. Essential for preventing DoS attacks and API abuse.

### **express-slow-down** `^3.0.1`
**Purpose**: Gradual response slowdown middleware
**Why**: Gradually increases response time for clients making too many requests. Works alongside rate limiting for more sophisticated abuse protection.

### **compression** `^1.7.4`
**Purpose**: Response compression middleware
**Why**: Compresses HTTP responses (gzip) to reduce bandwidth usage and improve response times, especially important for larger JSON payloads.

## 🗄️ Database & ORM

### **@prisma/client** `6.1.0` (devDependency)
**Purpose**: Prisma database client
**Why**: Type-safe database client generated from Prisma schema. Provides excellent TypeScript integration and query building for our PostgreSQL database.

### **prisma** `6.1.0` (devDependency)
**Purpose**: Prisma CLI and development tools
**Why**: Database schema management, migration generation, and development tools. Used for database schema evolution and code generation.

### **@prisma/adapter-pg** `^7.3.0`
**Purpose**: PostgreSQL adapter for Prisma
**Why**: Provides optimized PostgreSQL connection and query execution for Prisma client, ensuring best performance with PostgreSQL.

### **@prisma/client-runtime-utils** `^7.3.0`
**Purpose**: Prisma client runtime utilities
**Why**: Internal utilities used by Prisma client for runtime operations, query optimization, and type safety.

### **pg** `^8.18.0`
**Purpose**: PostgreSQL database driver
**Why**: Native PostgreSQL client for Node.js. Used directly for raw SQL queries when Prisma ORM capabilities are insufficient.

## 📝 Logging & Monitoring

### **morgan** `^1.10.0`
**Purpose**: HTTP request logger middleware
**Why**: Logs HTTP requests in a structured format. Essential for debugging, monitoring, and auditing API usage in development and production.

### **winston** `^3.19.0`
**Purpose**: Universal logging library
**Why**: Provides structured logging with multiple transports (file, console, database). Essential for application monitoring, debugging, and error tracking.

## 🌐 Real-time Communication

### **socket.io** `^4.8.3`
**Purpose**: Real-time WebSocket communication
**Why**: Enables real-time features like live trip updates, notifications, and collaborative editing. Essential for the interactive nature of group trip planning.

### **socket.io-client** `^4.8.3` (devDependency)
**Purpose**: Socket.io client for testing
**Why**: Used in integration tests to test WebSocket functionality and real-time features. Ensures WebSocket communication works correctly.

## 📤 File Upload & Email

### **multer** `^2.0.2`
**Purpose**: Multipart/form-data handling for file uploads
**Why**: Handles file uploads (trip photos, documents, receipts). Provides secure file handling with size limits and type validation.

### **nodemailer** `^7.0.13`
**Purpose**: Email sending library
**Why**: Sends transactional emails (user verification, trip invitations, notifications). Essential for user communication and workflow automation.

### **handlebars** `^4.7.8`
**Purpose**: Template engine for email/document generation
**Why**: Creates dynamic HTML email templates and document generation. Used for consistent, branded email communications.

## 📚 API Documentation

### **swagger-jsdoc** `^6.2.8`
**Purpose**: OpenAPI/Swagger specification generation
**Why**: Generates API documentation from JSDoc comments in code. Creates comprehensive, interactive API documentation for developers.

### **swagger-ui-express** `^5.0.1`
**Purpose**: Swagger UI middleware for Express
**Why**: Serves interactive API documentation interface. Allows developers to explore and test API endpoints directly from the browser.

## ✅ Data Validation

### **zod** `^3.22.0`
**Purpose**: TypeScript-first schema validation
**Why**: Validates request/response data with full TypeScript integration. Ensures data integrity and provides excellent developer experience with type inference.

## 🧪 Testing Framework & Utilities

### **supertest** `^6.3.3` (devDependency)
**Purpose**: HTTP assertion testing
**Why**: Tests HTTP endpoints by making actual requests. Essential for integration testing of our REST API endpoints.

### **tsx** `^4.21.0` (devDependency)
**Purpose**: TypeScript execution and testing
**Why**: Executes TypeScript files directly without compilation. Used for running tests and development scripts.

## 🔧 Development & Build Tools

### **typescript** `^5.3.3` (devDependency)
**Purpose**: TypeScript compiler and language support
**Why**: Provides static typing, better IDE support, and compile-time error checking. Essential for maintaining code quality in a complex application.

## 📦 Type Definitions (DevDependencies)

All `@types/*` packages provide TypeScript type definitions for JavaScript libraries:

- **@types/bcrypt** `^6.0.0`: Type definitions for bcrypt
- **@types/compression** `^1.7.5`: Type definitions for compression middleware
- **@types/cookie-parser** `^1.4.10`: Type definitions for cookie-parser
- **@types/cors** `^2.8.17`: Type definitions for cors middleware
- **@types/express** `^4.17.21`: Type definitions for Express framework
- **@types/jsonwebtoken** `^9.0.10`: Type definitions for JWT library
- **@types/morgan** `^1.9.9`: Type definitions for Morgan logger
- **@types/multer** `^2.0.0`: Type definitions for Multer file upload
- **@types/node** `^25.1.0`: Type definitions for Node.js core modules
- **@types/nodemailer** `^7.0.9`: Type definitions for Nodemailer
- **@types/socket.io** `^3.0.2`: Type definitions for Socket.io server
- **@types/supertest** `^2.0.16`: Type definitions for Supertest
- **@types/swagger-jsdoc** `^6.0.4`: Type definitions for Swagger JSDoc
- **@types/swagger-ui-express** `^4.1.8`: Type definitions for Swagger UI Express

**Why these are needed**: TypeScript requires type definitions for JavaScript libraries to provide IntelliSense, compile-time checking, and IDE support. These packages ensure full TypeScript compatibility.

## 🎯 Runtime Environment

### **Node.js** `>=20`
**Purpose**: JavaScript runtime environment
**Why**: The application requires Node.js version 20 or higher for modern JavaScript features, performance improvements, and security updates.

## 📊 Package Categories Summary

| Category | Count | Purpose |
|----------|--------|----------|
| Core Framework | 2 | Web server foundation |
| Authentication & Security | 5 | User security and data protection |
| Rate Limiting | 3 | API protection and performance |
| Database | 4 | Data persistence and queries |
| Logging & Monitoring | 2 | Application observability |
| Real-time | 2 | WebSocket communication |
| File & Email | 3 | Media and communication |
| API Documentation | 2 | Developer tools |
| Validation | 1 | Data integrity |
| Testing | 2 | Quality assurance |
| Development Tools | 1 | Build and development |
| Type Definitions | 14 | TypeScript support |

## 🔄 Dependency Management Strategy

1. **Production Dependencies**: Essential runtime packages needed for the application to function
2. **Development Dependencies**: Tools and utilities needed only during development and testing
3. **Version Pinning**: Prisma packages use exact versions (6.1.0) for consistency
4. **Security Updates**: Regular updates for security-critical packages (bcrypt, helmet, etc.)
5. **Type Safety**: Comprehensive TypeScript support through @types packages

## 🚀 Key Architectural Decisions

1. **Express.js**: Chosen for its maturity, extensive middleware ecosystem, and community support
2. **Prisma**: Selected for type-safe database access and excellent TypeScript integration
3. **PostgreSQL**: Robust relational database with JSON support for flexible data structures
4. **JWT Authentication**: Stateless authentication suitable for API-first architecture
5. **Socket.io**: Industry standard for real-time web applications
6. **Zod**: TypeScript-first validation with excellent DX and type inference
7. **Winston**: Flexible logging solution with multiple transport options
8. **Bun**: Modern JavaScript runtime used for faster development and testing

This package selection creates a robust, secure, and scalable foundation for the group trip planner application while maintaining excellent developer experience through comprehensive TypeScript support.