# Post-MVP Infrastructure Enhancement Plan

**Prepared by:** LilacBeacon (Boss Agent)
**Based on:** Homelab Expert Infrastructure Review
**Date:** 2026-01-30
**Status:** Post-MVP Enhancement Roadmap

---

## Overview

This document outlines infrastructure enhancements to be implemented **after MVP deployment** to transform the Group Planner from a functional homelab application to an enterprise-grade, highly available system.

**Current MVP Infrastructure (Phase 2E delivers):**
- ✅ Basic reverse proxy with SSL
- ✅ Production Docker deployment
- ✅ Automated daily backups
- ✅ Basic monitoring and health checks
- ✅ CI/CD deployment pipeline

**Post-MVP Enhancement Goals:**
- High availability and fault tolerance
- Advanced monitoring and alerting
- Performance optimization and scaling
- Enterprise security hardening
- Disaster recovery capabilities

---

## Phase 3: Advanced Infrastructure (Post-MVP Weeks 1-2)

### 3A: High Availability & Performance (Week 1)

**Load Balancing & Scaling:**
```yaml
# Advanced Traefik configuration
api:
  deploy:
    replicas: 2
    update_config:
      parallelism: 1
      delay: 10s
  labels:
    - "traefik.http.services.api.loadbalancer.sticky.cookie=true"
    - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
    - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"
```

**Redis Cluster for Socket.io Scaling:**
```yaml
redis-cluster:
  image: redis:7-alpine
  command: redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes.conf
  deploy:
    replicas: 3
  environment:
    REDIS_CLUSTER_ANNOUNCE_IP: ${NODE_IP}
```

**Database Connection Pooling:**
```javascript
// Advanced Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling for high availability
  __internal: {
    engine: {
      binaryTarget: 'native',
      timeout: 5000,
      maxRequestTimeout: 30000,
      connection_limit: 20,
      pool_timeout: 30,
    },
  },
})
```

**Performance Optimizations:**
- CDN setup for static assets (CloudFlare or local nginx caching)
- Database query optimization with explain analyze
- Redis caching for frequently accessed data
- Image optimization and compression
- Bundle size optimization with code splitting

### 3B: Advanced Monitoring & Observability (Week 1)

**Comprehensive Monitoring Stack:**
```yaml
# monitoring/docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=90d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
      GF_INSTALL_PLUGINS: grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards
      - ./datasources:/etc/grafana/provisioning/datasources

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points'
      - '^/(sys|proc|dev|host|etc|rootfs/var/lib/docker/containers|rootfs/var/lib/docker/overlay2|rootfs/run/docker/netns|rootfs/var/lib/docker/aufs)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

**Application Performance Monitoring:**
```javascript
// Advanced Sentry configuration
import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
    new Sentry.Integrations.Http({ breadcrumbs: true, tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Postgres(),
    new Sentry.Integrations.Redis(),
  ],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers.authorization
    }
    return event
  },
})
```

**Advanced Alerting Rules:**
```yaml
# prometheus/alert.rules.yml
groups:
- name: application
  rules:
  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time on {{ $labels.instance }}"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate: {{ $value | humanizePercentage }}"

  - alert: DatabaseSlowQueries
    expr: rate(postgres_slow_queries_total[5m]) > 0.1
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Database experiencing slow queries"

- name: infrastructure
  rules:
  - alert: HighCPUUsage
    expr: (100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "CPU usage above 80% on {{ $labels.instance }}"

  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Memory usage above 90% on {{ $labels.instance }}"

  - alert: DiskSpaceLow
    expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Disk space below 10% on {{ $labels.instance }}"
```

## Phase 4: Security & Compliance (Post-MVP Weeks 3-4)

### 4A: Advanced Security Hardening

**Container Security Enhancement:**
```yaml
# Security-hardened container configuration
api:
  image: group-planner-api:latest
  security_opt:
    - no-new-privileges:true
    - apparmor:unconfined
  cap_drop:
    - ALL
  cap_add:
    - CHOWN
    - SETGID
    - SETUID
  read_only: true
  tmpfs:
    - /tmp:noexec,nosuid,size=100m
    - /var/cache:noexec,nosuid,size=50m
  user: "1001:1001"
  environment:
    NODE_ENV: production
    SECURE_HEADERS: true
    CSP_REPORT_URI: /api/security/csp-report
```

**Network Security:**
```bash
# Advanced firewall configuration
#!/bin/bash
# network-security.sh

# Default policies
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# SSH (rate limited)
ufw limit 22/tcp

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Docker network isolation
ufw allow from 172.17.0.0/16 to any port 5432  # PostgreSQL
ufw allow from 172.17.0.0/16 to any port 6379  # Redis

# Monitoring (internal only)
ufw allow from 172.17.0.0/16 to any port 9090  # Prometheus
ufw allow from 172.17.0.0/16 to any port 3000  # Grafana

# Enable fail2ban for intrusion prevention
systemctl enable fail2ban
systemctl start fail2ban
```

**Application Security Enhancements:**
```javascript
// Enhanced security middleware
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import helmet from 'helmet'

// Advanced rate limiting
const advancedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.user?.role === 'admin') return 200
    if (req.user) return 100
    return 20 // Anonymous users
  },
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Request throttling for expensive operations
const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: 500,
  maxDelayMs: 20000,
})

// Advanced security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://trusted-images.com"],
      connectSrc: ["'self'", "wss:", "https://api.trusted.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))
```

### 4B: Compliance & Audit Logging

**Comprehensive Audit System:**
```javascript
// audit-logger.ts
export class AuditLogger {
  private logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: '/logs/audit.log',
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10,
        tailable: true
      }),
      new winston.transports.File({
        filename: '/logs/security.log',
        level: 'warn',
        maxsize: 50 * 1024 * 1024,
        maxFiles: 5
      })
    ]
  })

  logSecurityEvent(event: SecurityEvent) {
    this.logger.warn('SECURITY_EVENT', {
      type: event.type,
      user: event.userId,
      ip: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date().toISOString(),
      details: event.details
    })
  }

  logDataAccess(access: DataAccessEvent) {
    this.logger.info('DATA_ACCESS', {
      userId: access.userId,
      resource: access.resource,
      action: access.action,
      timestamp: new Date().toISOString(),
      success: access.success
    })
  }
}
```

## Phase 5: Disaster Recovery & Business Continuity (Post-MVP Week 5)

### 5A: Advanced Backup & Recovery

**Multi-Tier Backup Strategy:**
```bash
#!/bin/bash
# advanced-backup.sh

BACKUP_DIR="/backup"
S3_BUCKET="group-planner-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Hot backup (continuous)
docker exec postgres pg_basebackup -U planner -D /backup/hot -Ft -z -P

# Daily backup with compression
docker exec postgres pg_dump -U planner -d groupplanner --verbose --clean --no-owner --no-acl | \
  gzip > $BACKUP_DIR/daily/postgres_$DATE.sql.gz

# Weekly full backup with point-in-time recovery
docker exec postgres pg_dump -U planner -d groupplanner --verbose --clean --no-owner --no-acl --format=custom | \
  gzip > $BACKUP_DIR/weekly/postgres_$DATE.backup.gz

# Redis backup
docker exec redis redis-cli --rdb /data/dump_$DATE.rdb BGSAVE
docker cp redis:/data/dump_$DATE.rdb $BACKUP_DIR/redis/

# File system backup
tar -czf $BACKUP_DIR/files/app_files_$DATE.tar.gz /opt/group-planner/uploads

# Off-site backup to S3
aws s3 sync $BACKUP_DIR/ s3://$S3_BUCKET/backups/

# Cleanup (keep 30 daily, 12 weekly)
find $BACKUP_DIR/daily -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR/weekly -name "*.gz" -mtime +84 -delete
```

**Disaster Recovery Testing:**
```bash
#!/bin/bash
# dr-test.sh

# Automated disaster recovery testing
echo "Starting DR test at $(date)"

# Create test environment
docker-compose -f docker-compose.dr-test.yml up -d

# Restore from latest backup
LATEST_BACKUP=$(ls -t /backup/daily/postgres_*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | docker exec -i postgres-test psql -U planner -d groupplanner

# Run smoke tests
curl -f http://localhost:4001/health/ready || exit 1
curl -f http://localhost:4001/api/auth/status || exit 1

# Verify data integrity
RECORD_COUNT=$(docker exec postgres-test psql -U planner -d groupplanner -t -c "SELECT COUNT(*) FROM trips")
if [ $RECORD_COUNT -eq 0 ]; then
  echo "ERROR: No data restored"
  exit 1
fi

echo "DR test completed successfully at $(date)"
docker-compose -f docker-compose.dr-test.yml down
```

### 5B: Performance Testing & Optimization

**Load Testing Infrastructure:**
```yaml
# loadtest/docker-compose.yml
services:
  k6:
    image: grafana/k6:latest
    volumes:
      - ./scripts:/scripts
    environment:
      K6_PROMETHEUS_RW_SERVER_URL: http://prometheus:9090/api/v1/write
    command: run /scripts/load-test.js

  artillery:
    image: artilleryio/artillery:latest
    volumes:
      - ./artillery:/artillery
    command: run /artillery/load-test.yml
```

**Performance Test Scripts:**
```javascript
// k6-load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.02'],
  },
}

export default function() {
  // Authentication test
  const loginRes = http.post('http://api:4000/api/auth/login', {
    email: 'test@example.com',
    password: 'password123'
  })

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login response time < 200ms': (r) => r.timings.duration < 200,
  })

  const token = loginRes.json('accessToken')

  // API endpoint testing
  const tripsRes = http.get('http://api:4000/api/trips', {
    headers: { Authorization: `Bearer ${token}` }
  })

  check(tripsRes, {
    'trips fetch successful': (r) => r.status === 200,
    'trips response time < 300ms': (r) => r.timings.duration < 300,
  })

  sleep(1)
}
```

---

## Implementation Priority Matrix

### Immediate Post-MVP (Month 1)
**High Impact, High Priority:**
- Redis cluster for Socket.io scaling
- Advanced monitoring and alerting
- Load balancing for API services
- Automated off-site backups

### Medium Term (Months 2-3)
**Medium Impact, Medium Priority:**
- Performance optimization and CDN
- Advanced security hardening
- Comprehensive audit logging
- Load testing infrastructure

### Long Term (Months 4-6)
**Lower Impact, Future Planning:**
- Disaster recovery automation
- Compliance reporting
- Multi-region deployment
- Enterprise SSO integration

---

## Resource Requirements

### Additional Hardware (Post-MVP)
```
Production Server: 8 cores, 32GB RAM, 2TB SSD
Monitoring Server: 4 cores, 16GB RAM, 1TB SSD
Backup Storage: 4TB external storage or cloud
Network: 1Gbps dedicated or business internet
UPS: 1500VA for both servers
```

### Additional Software Costs
```
Monitoring: Grafana Cloud Pro ($49/month) OR self-hosted (free)
Backup: AWS S3 Glacier ($30/month for 1TB)
SSL: Wildcard certificate ($100/year) OR Let's Encrypt (free)
Security: Qualys vulnerability scanning ($200/month) OR self-hosted
Domain: Business domain with professional DNS ($50/year)

Total: $100-300/month depending on choices
```

---

## Success Metrics (Post-MVP)

### Reliability
- **Uptime**: 99.9% availability (8.76 hours downtime/year)
- **RTO**: Recovery Time Objective < 4 hours
- **RPO**: Recovery Point Objective < 1 hour
- **MTTR**: Mean Time To Recovery < 30 minutes

### Performance
- **Response Time**: API 95th percentile < 200ms
- **Throughput**: Support 1000+ concurrent users
- **Database**: Query performance < 100ms average
- **Real-time**: WebSocket latency < 50ms

### Security
- **Vulnerabilities**: Zero critical, < 5 high severity
- **Compliance**: Annual security audit passing
- **Incident Response**: < 15 minutes detection to response
- **Backup Recovery**: 100% success rate on monthly tests

---

## Conclusion

This post-MVP infrastructure plan transforms Group Planner from a functional homelab application to an enterprise-grade platform capable of supporting thousands of users with high availability, comprehensive monitoring, and robust disaster recovery.

**Key Benefits:**
- **Scalability**: Handle 10x user growth without major changes
- **Reliability**: 99.9% uptime with automated failover
- **Security**: Enterprise-grade security with comprehensive audit trails
- **Maintainability**: Automated monitoring, alerting, and recovery procedures

**Implementation Timeline:**
- **Month 1**: High availability and advanced monitoring
- **Months 2-3**: Security hardening and performance optimization
- **Months 4-6**: Disaster recovery and compliance features

The infrastructure roadmap ensures Group Planner can evolve from MVP to enterprise platform while maintaining cost-effectiveness appropriate for homelab deployment.