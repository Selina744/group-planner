# SELINA - Human Verification Required

**Project:** group-planner
**Last Updated:** 2026-02-12
**Purpose:** Track items requiring human verification that AI cannot fully test

---

## PHASE 1 HUMAN VERIFICATION CHECKLIST

### 1. End-to-End User Authentication Flow
**Priority:** P0 - CRITICAL
**Why AI Can't Test:** Requires real email delivery and browser interaction

**Test Checklist:**
- [ ] User can register with valid email
- [ ] Verification email arrives (requires email server)
- [ ] Email verification link works and marks user as verified
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect password (shows error, not hang)
- [ ] Password reset email arrives and link works
- [ ] New password functions after reset
- [ ] Refresh token rotation works correctly
- [ ] Logout clears tokens properly
- [ ] Protected routes redirect unauthenticated users to login
- [ ] After login, user redirects to dashboard (or intended page)

---

### 2. Trip Creation & Management Flow
**Priority:** P0 - CRITICAL
**Why AI Can't Test:** Requires visual UI verification and user interaction

**Test Checklist:**
- [ ] "Start Planning Your Trip" button navigates to trip creation
- [ ] Trip creation form displays and validates correctly
- [ ] Created trip appears in dashboard
- [ ] Trip details page loads with correct data
- [ ] Trip can be edited by host
- [ ] Trip can be deleted by host (with confirmation)
- [ ] Non-host cannot delete trip

---

### 3. Trip Invite Code Flow
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires cross-browser/device testing

**Test Checklist:**
- [ ] Host can generate invite code
- [ ] Code displays correctly and can be copied
- [ ] Code works when shared via text/email
- [ ] Non-authenticated user sees login/register when using code
- [ ] After signup/login, user joins trip automatically
- [ ] Invalid codes show clear error message
- [ ] Member appears in trip after joining

---

### 4. Event Management Flow
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires visual calendar/timeline verification

**Test Checklist:**
- [ ] Event creation form works for all event types
- [ ] Events display on timeline/calendar correctly
- [ ] Event proposal workflow works (member proposes, host approves)
- [ ] Conflict detection shows warning for overlapping events
- [ ] Event can be edited and deleted
- [ ] Event status changes reflect in UI immediately

---

### 5. Item & Claim Management Flow
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires visual progress indicators and multi-user testing

**Test Checklist:**
- [ ] Recommended items can be created by any member
- [ ] Shared items can be created by host only
- [ ] Claim button works and updates quantity display
- [ ] Progress bar shows correct claim percentage
- [ ] Multiple users can claim same item (if quantity allows)
- [ ] Unclaim releases the item back to available
- [ ] Essential items are visually highlighted

---

### 6. Notification System
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires email delivery and UI badge verification

**Test Checklist:**
- [ ] Notification bell shows unread count
- [ ] Clicking notification opens popover/dropdown
- [ ] Notifications display with correct type icons
- [ ] Mark as read updates notification state
- [ ] Mark all as read clears all notifications
- [ ] Notification preferences save correctly
- [ ] Email notifications arrive when enabled

---

### 7. Mobile Responsiveness
**Priority:** P2 - MEDIUM
**Why AI Can't Test:** Requires visual verification on actual devices

**Test Checklist:**
- [ ] All pages render correctly on mobile (375px width)
- [ ] Tablet layout works (768px width)
- [ ] Desktop layout works (1920px width)
- [ ] Navigation menu works on mobile
- [ ] Forms are usable on touch devices
- [ ] Button targets are touch-friendly (44x44px minimum)
- [ ] No horizontal scroll required
- [ ] Modals display correctly on small screens

---

### 8. Permission & Role-Based Access
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires multi-user concurrent testing

**Test Checklist:**
- [ ] HOST can perform all actions on their trip
- [ ] CO_HOST can manage events/members but not delete trip
- [ ] MEMBER can view content and propose events
- [ ] Non-member gets proper error when accessing trip
- [ ] Removed member loses access immediately
- [ ] Role changes take effect immediately

---

### 9. Security Verification
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires penetration testing tools

**Test Checklist:**
- [ ] XSS prevention (try injecting script tags)
- [ ] Expired JWT tokens are rejected
- [ ] Invalid JWT signatures are rejected
- [ ] Rate limiting works on auth endpoints
- [ ] Passwords are never visible in logs or responses
- [ ] HTTPS enforced in production

---

### 10. Production Deployment
**Priority:** P1 - HIGH
**Why AI Can't Test:** Requires actual deployment environment

**Test Checklist:**
- [ ] Docker Compose brings up all services
- [ ] All services pass health checks
- [ ] Database migrations run successfully
- [ ] SSL certificates work (if configured)
- [ ] Logs are accessible and properly formatted
- [ ] Backup script runs successfully
- [ ] Application accessible from external network

---

## RESOLVED ISSUES

### Authentication Errors (2026-02-11)
**Status:** Monitoring
**Previous Issue:** Multiple agent crashes with authentication errors
**Resolution:** System Administrator JadeBarn investigated and documented patterns

### Pane Management Failures (2026-02-11)
**Status:** Monitoring
**Previous Issue:** Pane no longer exists errors in tmux/ntm system

---

## NOTES FOR SELINA

1. **Before marking Phase 1 complete:** All P0 and P1 items above must be verified
2. **Testing environment:** Use the seed data or create fresh test accounts
3. **Browser testing:** Test in Chrome, Firefox, and Safari if possible
4. **Mobile testing:** Use actual devices or browser dev tools device emulation
5. **Report issues:** Create beads for any failures found during verification

---

*This document maintained by Boss Agent. Last updated after Phase 1 functionality review.*
