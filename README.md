# Tars Full Stack Chat

A Next.js + TypeScript + Convex + Clerk real-time chat app implementing the internship challenge requirements.

## Features implemented

- Clerk auth (sign up / sign in / logout) and user sync to Convex.
- User list + search (excluding current user).
- One-on-one conversation create/open.
- Real-time messages with timestamps.
- Empty states for users, conversations, and messages.
- Responsive layout (mobile conversation-first with back button).
- Online/offline indicator and last seen tracking.
- Typing indicator with 2-second inactivity window.
- Unread message count and clear on open.
- Smart auto-scroll with "new messages" hint.
- Optional features included: soft delete messages and reactions.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env.local
   ```
3. Configure Clerk + Convex credentials.
4. Run Convex dev:
   ```bash
   npm run convex:dev
   ```
5. Run Next app:
   ```bash
   npm run dev
   ```

## Notes

- Group chat and advanced loading/error states can be extended from the existing schema.
