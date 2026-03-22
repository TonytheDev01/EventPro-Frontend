# EventPro Frontend

 A multi-role event management web application — built for organizers, administrators, and attendees.


**Live:** [tonythedev01.github.io/EventPro-Frontend](https://tonythedev01.github.io/EventPro-Frontend)  
**Backend API:** [eventpro-fxfv.onrender.com/api](https://eventpro-fxfv.onrender.com/api)  
**Built by:** Group 8 — TechCrush Capstone 2026

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Screens & Pages](#screens--pages)
- [Roles & Access Control](#roles--access-control)
- [API Integration](#api-integration)
- [Getting Started](#getting-started)
- [Branch & PR Workflow](#branch--pr-workflow)
- [Coding Standards](#coding-standards)
- [Environment & Auth](#environment--auth)
- [Known Limitations](#known-limitations)
- [Team](#team)



## Overview

EventPro is a full-featured event management platform built as a capstone project. It supports three distinct user roles — **Admin**, **Organizer**, and **Attendee** — each with their own dashboard, access controls, and workflows.

The frontend is built with plain HTML, CSS, and vanilla JavaScript — no frameworks, no bundlers — and integrates with a Node.js/Express REST API backend hosted on Render.


## Features

### Admin
- Dedicated admin login at a private URL
- Platform-wide event oversight — view, manage and hard-delete events
- Organizer management — view, verify and reset organizer passwords
- Real-time attendance monitoring across all events
- Summary reports and platform statistics
- Role-aware sidebar and breadcrumb navigation

### Organizer
- Full event lifecycle — create, manage, and track own events
- Attendee management — add attendees via CSV upload
- Check-in monitoring via real-time attendance screen
- Event reports and ticket statistics scoped to own events
- Duplicate event detection on creation

### Attendee
- Browse and register for available events
- My Tickets — view all registered events with ticket details
- QR code ticket with check-in status
- Profile and settings management

### Platform-wide
- Role-based sidebar — each role sees only their relevant tabs
- Mobile-first responsive layout across all screens
- Toast notification system
- Client-side form validation
- CSV import with validation and error reporting
- Appwrite JWT integration for social login


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 — semantic elements throughout |
| Styling | CSS3 — custom properties, mobile-first, rem units |
| Scripting | Vanilla JavaScript — ES5 (`var`, regular functions, `.then/.catch`) |
| Charts | Chart.js 4.4.0 |
| Fonts | Google Fonts — Poppins |
| Auth | Custom JWT via backend + Appwrite JWT |
| Backend | Node.js / Express — hosted on Render |
| Version Control | Git + GitHub |
| Deployment | GitHub Pages (primary) |

> **No frameworks.** No React, no Vue, no bundler. Plain HTML/CSS/JS throughout.


## Folder Structure

EventPro-Frontend/
├── assets/
│   └── images/              — logos, illustrations, icons
├── js/
│   ├── services/
│   │   └── auth-service.js  — login, logout, token storage, profile fetch
│   ├── utils/
│   │   └── load-components.js — role-aware sidebar + topbar injection
│   ├── admin-dashboard.js
│   ├── admin-events.js
│   ├── admin-login.js
│   ├── admin-report.js
│   ├── attendees.js
│   ├── create-event.js
│   ├── csv-validation.js
│   ├── duplicate-detection.js
│   ├── forgot-password.js
│   ├── organizer-dashboard.js
│   ├── organizer-events.js
│   ├── organizer-management.js
│   ├── organizer-report.js
│   ├── real-time-attendance.js
│   ├── role-selection.js
│   ├── settings.js
│   ├── sign-in.js
│   ├── signup.js
│   ├── ticket-details.js
│   └── upload.js
├── pages/
│   ├── admin-dashboard.html
│   ├── admin-events.html
│   ├── admin-login.html        — private URL, not linked publicly
│   ├── admin-report.html
│   ├── attendees.html
│   ├── auth-reset-password.html
│   ├── create-event.html
│   ├── csv-validation.html
│   ├── duplicate-detection.html
│   ├── forget-password.html
│   ├── organizer-accounts.html
│   ├── organizer-dashboard.html
│   ├── organizer-events.html
│   ├── organizer-management.html
│   ├── organizer-reports.html
│   ├── real-time-attendance.html
│   ├── role-selection.html
│   ├── settings.html
│   ├── sign-in.html
│   ├── signup.html
│   ├── sms-verification.html
│   ├── ticket-details.html
│   └── upload.html
├── styles/
│   ├── dashboard-layout.css   — shared sidebar + topbar shell
│   ├── admin-events.css
│   ├── attendees.css
│   ├── csv-validation.css
│   ├── organizer-events.css
│   ├── real-time-attendance.css
│   ├── settings.css
│   ├── sign-in.css
│   ├── signup.css
│   ├── upload.css
│   └── ...
└── README.md
```

---

## Screens & Pages

| Screen | File | Role |
|--------|------|------|
| Sign In | `sign-in.html` | All |
| Sign Up | `signup.html` | All |
| Role Selection | `role-selection.html` | New users only |
| Forgot Password | `forget-password.html` | All |
| Reset Password | `auth-reset-password.html` | All |
| Admin Login | *(private — shared internally)* | Admin only |
| Admin Dashboard | `admin-dashboard.html` | Admin |
| Admin Events | `admin-events.html` | Admin |
| Admin Reports | `admin-report.html` | Admin |
| Organizer Dashboard | `organizer-dashboard.html` | Organizer |
| Organizer Events | `organizer-events.html` | Organizer |
| Organizer Reports | `organizer-reports.html` | Organizer |
| Organizer Management | `organizer-management.html` | Admin |
| Organizer Accounts | `organizer-accounts.html` | Admin |
| Attendees | `attendees.html` | Admin + Organizer |
| Attendees — Events Tab | `attendees.html?tab=events` | Attendee |
| Attendees — My Tickets | `attendees.html?tab=tickets` | Attendee |
| Ticket Details | `ticket-details.html` | All |
| Real-Time Attendance | `real-time-attendance.html` | Admin + Organizer |
| Create Event | `create-event.html` | Organizer only |
| Upload Attendees | `upload.html` | Organizer only |
| CSV Validation | `csv-validation.html` | Organizer only |
| Duplicate Detection | `duplicate-detection.html` | Organizer only |
| Settings | `settings.html` | All |

---

## Roles & Access Control

EventPro uses three roles. Role is stored in `localStorage` after login and enforced on every page via `requireAuth()`.

| Feature          | Admin | Organizer | Attendee |
|---------         |-------|-----------|----------|
| View all events   | ✅ | ✅ own only | ✅ |
| Create events     | ❌ | ✅ | ❌ |
| Delete events     | ✅ | ❌ | ❌ |
| Add attendees via CSV | ❌ | ✅ | ❌ |
| Export attendee CSV | ✅ | ✅ | ❌ |
| Register for events | ❌ | ❌ | ✅ |
| View top organizers | ✅ | ❌ | ❌ |
| Manage organizers | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ own only | ❌ |
| Real-time check-in | ✅ | ✅ own only | ❌ |

**Admin login** is accessed via a private URL not linked anywhere in the app. Admins use `POST /auth/login/admin`.


## API Integration

**Base URL:** `https://eventpro-fxfv.onrender.com/api`

All authenticated requests include:
```
Authorization: Bearer {token}
Content-Type: application/json

### Key Endpoints Used

| Method | Endpoint | Used For |
|--------|----------|----------|
| `POST` | `/auth/login` | User + Organizer login |
| `POST` | `/auth/login/admin` | Admin login |
| `POST` | `/auth/signup` | New user registration |
| `POST` | `/auth/signup/organizer` | Organizer signup (admin only) |
| `GET` | `/auth/profile` | Fetch full user profile after login |
| `PUT` | `/auth/profile` | Update name, phone, smsEnabled |
| `GET` | `/auth/profile/registrations` | Attendee's registered events |
| `GET` | `/events` | List all events |
| `POST` | `/events` | Create event |
| `DELETE` | `/events/{id}` | Hard delete event (admin only) |
| `GET` | `/events/organizer/my-events` | Organizer's own events |
| `POST` | `/events/{eventId}/register` | Attendee self-registration |
| `GET` | `/events/{eventId}/attendees` | List attendees for event |
| `GET` | `/dashboard/stats` | Admin platform stats |
| `GET` | `/organizer/dashboard/stats` | Organizer-scoped stats |
| `GET` | `/admin/organizers` | List all organizers |

### Auth Flow

Login → POST /auth/login → store token + basic user
     → GET /auth/profile → store full user (firstName, lastName etc)
     → Check role → redirect to correct dashboard

New users with no role → `role-selection.html`  
Existing users with known role → dashboard directly


## Getting Started

### Prerequisites
- [VS Code](https://code.visualstudio.com/)
- [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/TonytheDev01/EventPro-Frontend.git

# Open in VS Code
cd EventPro-Frontend
code .
```

Open any page with Live Server (right-click → Open with Live Server).

No build step, no npm install, no environment variables needed for the frontend.

### Test Accounts

Contact the team lead for test credentials. Do not commit credentials to the repo.



## Branch & PR Workflow

All work happens on feature/fix branches. **Never commit directly to `main`.**

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create your branch
git checkout -b fix/your-fix-name   # for bug fixes
git checkout -b feat/your-feature   # for new features

# Stage and commit
git add <files>
git commit -m "fix(scope): short description"

# Push and open PR
git push origin fix/your-fix-name
```

### Commit Message Format

```
type(scope): short description

Examples:
fix(attendees): remove phone gate from register button
feat(admin-login): add dedicated admin login page
fix(load-components): remove create event from admin search routes
```

**Types:** `feat` `fix` `refactor` `style` `docs` `chore`

### PR Rules
- One concern per PR
- Lead developer (Tony) reviews and merges all PRs
- Never self-merge into main

---

## Coding Standards

This project enforces strict JavaScript coding standards throughout. All JS must follow these rules — no exceptions.

```javascript
// ✅ CORRECT
var eventId = params.get('eventId') || null;

function _loadAttendees(eventId) {
  fetch(url, { headers: headers })
    .then(function (res) { return res.json(); })
    .then(function (data) { /* render */ })
    .catch(function () { /* error handling */ });
}

// ❌ WRONG — do not use
const eventId = ...        // no const/let
const load = () => {}      // no arrow functions
async function load() {}   // no async/await
```

| Rule | Requirement |
|------|-------------|
| Variable declarations | `var` only — no `const` or `let` |
| Functions | Regular functions only — no arrow functions |
| Async | `.then().catch()` only — no `async/await` |
| Logging | No `console.log` in committed code |
| Alerts | No `alert()` — use toast system |
| Colors | CSS variables only — no hardcoded hex values |
| Spacing | `rem` for all spacing and font sizes |
| Borders | `px` only for `border` and `border-radius` |
| CSS prefixes | Each page's CSS classes prefixed by page (e.g. `att-`, `oe-`, `ae-`) |

---

## Environment & Auth

| Item | Value |
|------|-------|
| API Base URL | `https://eventpro-fxfv.onrender.com/api` |
| Appwrite Project ID | `evenpro` |
| Appwrite Endpoint | `https://fra.cloud.appwrite.io/v1` |
| Token storage | `localStorage` — key: `eventpro_token` |
| User storage | `localStorage` — key: `eventpro_user` |

Token and user are managed entirely through `js/services/auth-service.js`. All other files use `getStoredToken()` and `getStoredUser()` — never access localStorage directly.

---

## Known Limitations

| Item | Status |
|------|--------|
| `POST /events/{eventId}/register` 500 error | Backend fix pending from Ezekiel |
| `GET /auth/profile/registrations` | Endpoint built, integration pending test |
| Google OAuth | Appwrite config pending |
| Mobile/web data sync | Backend must use same DB for both platforms |
| Freemium limits | Upload cap: 10MB, attendee fetch limit: 500 |

---

## Team

| Role | Name |
|------|------|
| Lead Developer / PR Reviewer | Tony (TonytheDev01) |
| Backend Developer | Ezekiel |
| Frontend Developer | Muhammad |
| Capstone Program | TechCrush 2026 — Group 8 |

---

*Last updated: March 22, 2026*