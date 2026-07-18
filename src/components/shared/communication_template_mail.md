# KarmaCoins XP — Email & Notification Templates

Content/copy draft for all Email + Push/In-app Notification use cases across the User app and Agent app. Placeholders use `{{double curly braces}}`.

---

## User App

### 1. Welcome (signup / Google sign-in)
**Email**
- Subject: Welcome to KarmaCoins XP, {{name}}!
- Body: Hi {{name}}, welcome aboard! Start scheduling pickups, earn Karma Coins for every recyclable item, and play the daily quiz to grow your streak. Let's make waste management rewarding.

**Notification**
- Title: Welcome to KarmaCoins XP
- Body: Hi {{name}}, your account is ready. Schedule your first pickup and start earning Karma Coins.

---

### 2. Forgot password — OTP
**Email**
- Subject: Your KarmaCoins XP verification code
- Body: Your OTP is {{otp}}. It is valid for 10 minutes. Do not share this code with anyone.

**Notification**
- Title: Verification code sent
- Body: We've sent a 6-digit code to {{email}}. Enter it to reset your password.

---

### 3. Password reset confirmation
**Email**
- Subject: Your password has been changed
- Body: Hi {{name}}, your KarmaCoins XP password was successfully updated. If you didn't make this change, please contact support immediately.

**Notification**
- Title: Password updated
- Body: Your password was changed successfully.

---

### 4. Booking placed (order confirmation)
**Email**
- Subject: Pickup request received — #{{bookingId}}
- Body: Hi {{name}}, we've received your pickup request for {{date}}, {{timeSlot}} at {{address}}. We'll notify you once an agent is assigned.

**Notification**
- Title: Pickup request received
- Body: Your pickup for {{date}} ({{timeSlot}}) has been scheduled. We'll find an agent for you shortly.

---

### 5. Agent assigned (`BOOKING_ACCEPTED`)
**Email**
- Subject: An agent is on the way!
- Body: Hi {{name}}, {{agentName}} has been assigned to your pickup #{{bookingId}}. They'll reach your location around {{eta}}.

**Notification** *(existing copy — keep)*
- Title: Agent assigned
- Body: {{agentName}} has been assigned to your pickup and is on the way.

---

### 6. Agent reached (`AGENT_REACHED`)
**Notification** *(existing copy — keep; email not needed, time-sensitive)*
- Title: Agent arrived
- Body: {{agentName}} has reached your location for pickup.

---

### 7. Pickup verified — coins credited (`BOOKING_PICKED_UP`)
**Email**
- Subject: You earned {{coins}} Karma Coins!
- Body: Hi {{name}}, your items have been verified and {{coins}} Karma Coins have been credited to your wallet. Total balance: {{walletBalance}}.

**Notification** *(existing copy — keep)*
- Title: +{{coins}} Karma Coins
- Body: Your pickup has been verified and coins have been added to your wallet.

---

### 8. Pickup completed (`BOOKING_COMPLETED`)
**Email**
- Subject: Pickup #{{bookingId}} completed — thank you!
- Body: Hi {{name}}, your pickup is complete. Thanks for recycling with KarmaCoins XP. Don't forget to rate your agent!

**Notification** *(existing copy — keep)*
- Title: Pickup complete
- Body: Booking complete. Thank you for using KarmaCoins XP!

---

### 9. Booking in queue (`BOOKING_IN_POOL`)
**Notification** *(existing copy — keep; email not needed)*
- Title: Added to priority queue
- Body: High demand right now — your pickup is in the queue and will be assigned to the next available agent.

---

### 10. Booking cancelled
**Email**
- Subject: Your pickup #{{bookingId}} was cancelled
- Body: Hi {{name}}, your pickup scheduled for {{date}} has been cancelled. You can schedule a new pickup anytime from the app.

**Notification** *(existing copy — keep)*
- Title: Booking cancelled
- Body: {{message}}

---

### 11. Rate your agent (reminder)
**Notification**
- Title: How was your pickup?
- Body: Rate {{agentName}} and help us improve our service. It only takes a few seconds.

---

### 12. Daily quiz available / streak reminder
**Notification**
- Title: 🔥 Your quiz streak is waiting!
- Body: Answer today's quiz correctly and earn 40 Karma Coins per question. Keep your {{streak}}-day streak alive!

**Email** *(optional, for lapsed users)*
- Subject: Don't lose your {{streak}}-day quiz streak!
- Body: Hi {{name}}, you haven't played today's KarmaCoins quiz yet. Play now before it resets at 5:30 AM IST.

---

### 13. Referral reward earned
**Email**
- Subject: You earned {{coins}} Karma Coins for referring {{friendName}}!
- Body: Hi {{name}}, your friend {{friendName}} just joined KarmaCoins XP using your referral code. {{coins}} Karma Coins have been added to your wallet.

**Notification**
- Title: Referral reward credited 🎉
- Body: {{friendName}} joined using your code — you earned {{coins}} Karma Coins!

---

## Agent App

### 1. Welcome / onboarding (first login)
**Email**
- Subject: Welcome to the KarmaCoins XP Agent team, {{name}}!
- Body: Hi {{name}}, your agent account is active. Go online from the dashboard to start receiving pickup requests near you.

**Notification**
- Title: Welcome aboard, {{name}}
- Body: Your agent account is ready. Go online to start receiving pickup requests.

---

### 2. New booking available nearby (`NEW_BOOKING_AVAILABLE`)
**Notification** *(existing copy — keep; email not needed, time-sensitive)*
- Title: New pickup request 🚛
- Body: A new pickup request is available near you.

---

### 3. Booking taken by another agent (`BOOKING_TAKEN`)
**Notification** *(existing copy — adjust to sentence case)*
- Title: Pickup taken
- Body: Another agent accepted this pickup request.

---

### 4. Booking cancelled by user (`BOOKING_CANCELLED`)
**Notification** *(existing copy — adjust to sentence case, drop emoji per convention)*
- Title: Booking cancelled
- Body: {{message}} (default: "The user has cancelled this booking.")

---

### 5. New rating received (`NEW_RATING_RECEIVED`)
**Email** *(weekly digest only — see #7; no per-rating email)*

**Notification** *(existing copy — adjust to sentence case)*
- Title: New rating received ⭐
- Body: Your new average rating is {{newAvgRating}} ({{totalRatings}} ratings).

---

### 6. Streak updated (`STREAK_UPDATED`)
**Notification**
- Title: 🔥 {{currentStreak}}-day streak!
- Body: Great work! You've completed pickups {{currentStreak}} days in a row. Your best streak: {{longestStreak}} days.

---

### 7. Weekly job summary
**Email**
- Subject: Your week on KarmaCoins XP — {{totalPickups}} pickups completed
- Body: Hi {{name}}, here's your weekly summary: {{totalPickups}} pickups completed, average rating {{rating}}, current streak {{currentStreak}} days. Keep up the great work!

---

## Notes for implementation
- Existing in-app notification copy (marked "existing copy — keep") is already live in `UserSocketContext.tsx` / `SocketContext.tsx` — no changes needed there beyond sentence-case cleanup on the Agent side (#3, #4, #5).
- Email sending requires backend integration (e.g. SendGrid/Nodemailer) — not yet implemented; this doc covers content only, ready for backend wiring once available.
- All copy follows sentence case and "Karma Coins" naming per project conventions; emojis used sparingly (🔥 for streaks, 🎉 for rewards, ⭐ for ratings) — drop if CTO prefers zero emojis.
