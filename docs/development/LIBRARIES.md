# Libraries and Dependencies

This document provides a comprehensive overview of all libraries, frameworks, and tools used in the Group Planner project.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [Infrastructure & Services](#infrastructure--services)
- [Development Tools](#development-tools)
- [Testing Frameworks](#testing-frameworks)
- [Security Libraries](#security-libraries)
- [Build & Development Tools](#build--development-tools)

---

## Architecture Overview

**Group Planner** is a full-stack web application built with modern technologies:

- **Frontend**: React 18 + TypeScript + Material-UI + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Runtime**: Bun (unified JavaScript runtime)
- **Testing**: Bun Test (unified test runner)
- **Infrastructure**: Docker + PostgreSQL + Redis
- **Development**: Hot reload, containerized services, testing tools

---

## Frontend Stack

### Core Framework
| Library | Version | Purpose |
|---------|---------|---------|
| **react** | ^18.2.0 | Core UI library for building component-based interfaces |
| **react-dom** | ^18.2.0 | DOM rendering layer for React components |
| **typescript** | ^5.2.2 | Static type checking and enhanced developer experience |

### UI Components & Styling
| Library | Version | Purpose |
|---------|---------|---------|
| **@mui/material** | ^5.15.0 | Material Design component library (buttons, forms, layouts) |
| **@mui/icons-material** | ^5.15.0 | Material Design icon set |
| **@emotion/react** | ^11.11.0 | CSS-in-JS styling library (required by MUI) |
| **@emotion/styled** | ^11.11.0 | Styled components for Emotion |
| **@fontsource/roboto** | ^5.0.8 | Roboto font package for Material Design consistency |

### State Management & HTTP
| Library | Version | Purpose |
|---------|---------|---------|
| **zustand** | ^5.0.10 | Lightweight state management (simpler alternative to Redux) |
| **axios** | ^1.13.4 | HTTP client for API requests with interceptors and error handling |

### Development Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| **vite** | ^5.0.8 | Fast build tool and development server |
| **@vitejs/plugin-react** | ^4.2.1 | Vite plugin for React support |
| **eslint** | ^8.55.0 | JavaScript/TypeScript linting |
| **@typescript-eslint/eslint-plugin** | ^6.14.0 | ESLint rules for TypeScript |
| **@typescript-eslint/parser** | ^6.14.0 | TypeScript parser for ESLint |
| **eslint-plugin-react-hooks** | ^4.6.0 | ESLint rules for React hooks |
| **eslint-plugin-react-refresh** | ^0.4.5 | ESLint rules for React Fast Refresh |

### Testing Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| **@testing-library/react** | ^14.1.0 | React testing utilities for component testing |
| **@testing-library/user-event** | ^14.5.0 | User interaction simulation for testing |
| **jsdom** | ^23.1.0 | DOM implementation for Node.js testing environment |

### Type Definitions
| Library | Version | Purpose |
|---------|---------|---------|
| **@types/react** | ^18.2.43 | TypeScript type definitions for React |
| **@types/react-dom** | ^18.2.17 | TypeScript type definitions for React DOM |

---

## Backend Stack

### Core Framework
| Library | Version | Purpose |
|---------|---------|---------|
| **express** | ^4.18.0 | Web framework for building RESTful APIs |
| **typescript** | ^5.3.3 | Static type checking and enhanced developer experience |

### Database & ORM
| Library | Version | Purpose |
|---------|---------|---------|
| **@prisma/client** | 6.1.0 | Type-safe database client and ORM |
| **@prisma/adapter-pg** | ^7.3.0 | PostgreSQL adapter for Prisma |
| **@prisma/client-runtime-utils** | ^7.3.0 | Prisma runtime utilities |
| **prisma** | 6.1.0 | Database toolkit and migration system |
| **pg** | ^8.18.0 | PostgreSQL client for Node.js |

### Authentication & Security
| Library | Version | Purpose |
|---------|---------|---------|
| **jsonwebtoken** | ^9.0.3 | JWT token creation and verification |
| **bcrypt** | ^6.0.0 | Password hashing and salt generation |
| **helmet** | ^7.1.0 | Security headers middleware |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing configuration |
| **express-rate-limit** | ^7.1.0 | Rate limiting middleware for DDoS protection |
| **express-slow-down** | ^3.0.1 | Request throttling middleware |

### Middleware & Utilities
| Library | Version | Purpose |
|---------|---------|---------|
| **morgan** | ^1.10.0 | HTTP request logging middleware |
| **compression** | ^1.7.4 | Response compression middleware |
| **cookie-parser** | ^1.4.7 | Cookie parsing middleware |
| **dotenv** | ^16.3.1 | Environment variable loading |
| **multer** | ^2.0.2 | Multipart form data handling for file uploads |

### Email
| Library | Version | Purpose |
|---------|---------|---------|
| **nodemailer** | ^7.0.13 | Email sending functionality |

### Validation & Documentation
| Library | Version | Purpose |
|---------|---------|---------|
| **zod** | ^3.22.0 | Schema validation and type inference |
| **swagger-jsdoc** | ^6.2.8 | OpenAPI documentation generation |
| **swagger-ui-express** | ^5.0.1 | Swagger UI middleware for API docs |

### Logging & Templates
| Library | Version | Purpose |
|---------|---------|---------|
| **winston** | ^3.19.0 | Logging library with multiple transports |
| **handlebars** | ^4.7.8 | Template engine for email and HTML generation |

### Development Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| **supertest** | ^6.3.3 | HTTP assertion library for API testing |
| **tsx** | ^4.21.0 | TypeScript execution engine for development |

### Type Definitions
| Library | Version | Purpose |
|---------|---------|---------|
| **@types/express** | ^4.17.21 | TypeScript types for Express |
| **@types/bcrypt** | ^6.0.0 | TypeScript types for bcrypt |
| **@types/compression** | ^1.7.5 | TypeScript types for compression |
| **@types/cookie-parser** | ^1.4.10 | TypeScript types for cookie-parser |
| **@types/cors** | ^2.8.17 | TypeScript types for CORS |
| **@types/jsonwebtoken** | ^9.0.10 | TypeScript types for JWT |
| **@types/morgan** | ^1.9.9 | TypeScript types for morgan |
| **@types/multer** | ^2.0.0 | TypeScript types for multer |
| **@types/node** | ^25.1.0 | TypeScript types for Node.js |
| **@types/nodemailer** | ^7.0.9 | TypeScript types for nodemailer |
| **@types/supertest** | ^2.0.16 | TypeScript types for supertest |
| **@types/swagger-jsdoc** | ^6.0.4 | TypeScript types for swagger-jsdoc |
| **@types/swagger-ui-express** | ^4.1.8 | TypeScript types for swagger-ui-express |

---

## Infrastructure & Services

### Core Services
| Service | Image | Purpose |
|---------|--------|---------|
| **PostgreSQL** | postgres:16-alpine | Primary database for application data |
| **Redis** | redis:7-alpine | Caching layer and session storage |

### Application Services
| Service | Purpose |
|---------|---------|
| **API Service** | Express.js backend running on port 4000 |
| **Web Service** | React frontend running on port 5173 |

### Service Configuration
- **Database**: PostgreSQL 16 with persistent volumes
- **Cache**: Redis 7 with data persistence
- **Runtime**: Bun (unified across frontend and backend)
- **Environment**: Docker containerized development

---

## Development Tools

### Database Management
| Tool | Image | Port | Purpose |
|------|--------|------|---------|
| **pgAdmin** | dpage/pgadmin4:8 | 5050 | PostgreSQL database administration |

### Email Testing
| Tool | Image | Port | Purpose |
|------|--------|------|---------|
| **MailHog** | mailhog/mailhog | 8025 | Email testing and debugging |

### Redis Management
| Tool | Image | Port | Purpose |
|------|--------|------|---------|
| **Redis Commander** | rediscommander/redis-commander | 8081 | Redis key-value store management |

### File Storage
| Tool | Image | Port | Purpose |
|------|--------|------|---------|
| **MinIO** | minio/minio | 9000/9001 | S3-compatible object storage for development |

### Access Information
- **pgAdmin**: http://localhost:5050 (admin@groupplanner.dev / admin123)
- **MailHog**: http://localhost:8025
- **Redis Commander**: http://localhost:8081 (admin / admin123)
- **MinIO Console**: http://localhost:9001 (admin / admin123456)

---

## Testing Frameworks

### Test Runners
| Framework | Purpose |
|-----------|---------|
| **Bun Test** | Unified test runner for both frontend and backend |
| **Supertest** | HTTP endpoint testing for Express APIs |

### Frontend Testing
| Library | Purpose |
|---------|---------|
| **@testing-library/react** | Component testing utilities |
| **@testing-library/user-event** | User interaction simulation |
| **jsdom** | DOM environment for Node.js testing |

### Backend Testing
| Library | Purpose |
|---------|---------|
| **supertest** | HTTP assertions and API testing |

### Testing Features
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **Database Testing**: Transactional test isolation
- **Mock Support**: Built-in mocking capabilities

---

## Security Libraries

### Authentication & Authorization
| Library | Security Feature |
|---------|------------------|
| **jsonwebtoken** | Stateless authentication with JWT tokens |
| **bcrypt** | Password hashing with salt (Blowfish cipher) |

### Web Security
| Library | Protection Against |
|---------|-------------------|
| **helmet** | XSS, clickjacking, MIME sniffing, and other web vulnerabilities |
| **cors** | Cross-origin resource sharing attacks |
| **express-rate-limit** | Brute force attacks and API abuse |
| **express-slow-down** | Request flooding and DoS attacks |

### Data Security
| Library | Security Feature |
|---------|------------------|
| **zod** | Input validation and sanitization |
| **compression** | Response size minimization (reduces attack surface) |

### Security Best Practices
- **Password Security**: bcrypt with configurable salt rounds
- **Token Security**: JWT with configurable expiration
- **Header Security**: Comprehensive security headers via Helmet
- **Rate Limiting**: Configurable request limits per IP
- **Input Validation**: Schema-based validation with Zod
- **CORS Policy**: Configurable cross-origin policies

---

## Build & Development Tools

### Build Tools
| Tool | Purpose |
|------|---------|
| **Vite** | Fast frontend build tool with HMR |
| **TypeScript** | Static type checking and compilation |
| **ESLint** | Code linting and style enforcement |

### Development Runtime
| Tool | Purpose |
|------|---------|
| **Bun** | Fast JavaScript runtime and package manager |
| **tsx** | TypeScript execution for development |

### Development Features
- **Hot Module Replacement**: Instant frontend updates
- **Watch Mode**: Automatic backend restart on changes
- **Type Checking**: Real-time TypeScript validation
- **Linting**: Code quality enforcement
- **Source Maps**: Debugging support in development

### Package Management
| Feature | Tool |
|---------|------|
| **Frontend**: Bun (fast package installation) |
| **Backend**: Bun (unified package manager) |
| **Lockfile**: bun.lockb (deterministic installs) |

---

## Library Selection Rationale

### Why These Choices?

**Bun Runtime**
- Unified JavaScript runtime for frontend and backend
- Faster package installation and execution
- Built-in test runner eliminates need for separate tools

**TypeScript**
- Type safety across the entire application
- Better developer experience and IDE support
- Reduced runtime errors

**Material-UI**
- Comprehensive component library with consistent design
- Accessibility features built-in
- Extensive customization options

**Zustand**
- Simpler state management compared to Redux
- Smaller bundle size and better performance
- TypeScript-first design

**Express + Prisma**
- Mature ecosystem with extensive middleware
- Type-safe database access with Prisma
- Easy API development and testing

**PostgreSQL + Redis**
- Reliable ACID-compliant primary database
- Fast caching layer for session and temporary data
- Excellent Docker support for development

This stack provides a modern, type-safe, and performant foundation for building scalable web applications.

## Removed Dependencies

### Socket.io (Removed - Non-MVP)
Socket.io was removed from the project and re-prioritized as a non-MVP feature for future development phases. This real-time communication library was previously planned for:

- Live trip updates and notifications
- Real-time collaboration on trip planning
- Instant messaging between trip members
- Live status updates for events and items

**Status**: Removed from codebase (February 2026)
**Future Consideration**: Will be re-evaluated for post-MVP features

---

**Last Updated**: February 2026
**Document Version**: 1.1