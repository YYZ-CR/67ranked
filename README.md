# 67Ranked - Hand Motion Counting Game

A production-ready, camera-based hand-motion game where players count "67 reps" as fast as possible within timed rounds. Built with Next.js, MediaPipe Hands, and Supabase.

![67Ranked](https://img.shields.io/badge/version-1.0.0-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🎮 Features

- **Normal Mode**: Solo play with global leaderboard (6.7s and 20s durations)
- **Duel Mode**: Real-time 1v1 matches with synchronized gameplay
- **Challenge Mode**: Async 1v1 where opponent plays later
- **Hand Tracking**: On-device MediaPipe Hands integration
- **Leaderboard**: Global rankings with tie-handling
- **Mobile-First**: Optimized for mobile Safari/Chrome

## 🏃 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase and JWT credentials in .env.local
```

### Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (generate a strong random string, min 32 chars)
JWT_SECRET=your_jwt_secret_min_32_characters_long

# App URL (for generating share links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

1. Go to your Supabase project
2. Open the SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/67ranked.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel domain)
5. Deploy!

### 3. Configure Supabase

1. In Supabase Dashboard → Settings → API
2. Add your Vercel domain to "Additional Redirect URLs"
3. Enable Realtime for `duels` and `duel_players` tables

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── session/            # Session token creation
│   │   ├── submit/             # Score submission
│   │   ├── leaderboard/        # Leaderboard queries
│   │   ├── duel/               # Duel endpoints
│   │   └── challenge/          # Challenge endpoints
│   ├── duel/                   # Duel pages
│   ├── challenge/              # Challenge pages
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── game/                   # Game UI components
│   └── leaderboard/            # Leaderboard components
├── hooks/                      # React hooks
├── lib/
│   ├── hand-tracking.ts        # MediaPipe integration
│   ├── jwt.ts                  # JWT utilities
│   ├── profanity.ts            # Username validation
│   ├── rate-limit.ts           # Rate limiting
│   └── supabase/               # Supabase clients
└── types/                      # TypeScript types
```

## 🎯 Rep Counting Algorithm

A "rep" counts when the player completes a 3-step hand orientation cycle:

1. **WAIT_OPPOSITE**: One hand points up, the other points down
2. **SWITCH_1**: Hands switch positions (up goes down, down goes up)
3. **SWITCH_2**: Hands return to original orientation

**Detection Method:**
- Uses wrist to middle finger MCP direction vector
- Requires both hands visible
- Stability check (3 consecutive frames)
- Minimum angle threshold (avoids horizontal hands)

```typescript
// Pseudocode
state = WAIT_OPPOSITE
initialConfig = null

onFrame(leftHand, rightHand):
  if not bothHandsDetected: return
  
  currentOrientation = getOrientations(leftHand, rightHand)
  if not isStable(currentOrientation): return
  
  switch state:
    case WAIT_OPPOSITE:
      if areOpposite(current): 
        initialConfig = current
        state = SWITCH_1
    
    case SWITCH_1:
      if isSwitched(current, initial):
        state = SWITCH_2
    
    case SWITCH_2:
      if current == initial:
        repCount++
        state = WAIT_OPPOSITE
```

## 🔒 Security

- **JWT Sessions**: All score submissions require valid session tokens
- **Server Validation**: Duration, timing, and mode verification
- **Rate Limiting**: 1 submission per 10 seconds per IP
- **Profanity Filter**: Username validation with custom word list
- **RLS Policies**: Row-level security on all tables

## 📊 API Endpoints

### Normal Mode
- `POST /api/session` - Create game session
- `POST /api/submit` - Submit score
- `GET /api/leaderboard?duration_ms=6700|20000` - Get leaderboard

### Duel Mode
- `POST /api/duel/create` - Create duel
- `POST /api/duel/join` - Join duel
- `POST /api/duel/ready` - Toggle ready status
- `POST /api/duel/start` - Start duel
- `POST /api/duel/session` - Get game session
- `POST /api/duel/submit` - Submit duel score
- `GET /api/duel/[duelId]` - Get duel info

### Challenge Mode
- `POST /api/challenge/create` - Create challenge
- `POST /api/challenge/session` - Get game session
- `POST /api/challenge/submit` - Submit challenge score
- `GET /api/challenge/[challengeId]` - Get challenge info

## ✅ Edge Cases & Testing

### Camera
- [ ] Permission denied → Shows error with retry
- [ ] No camera found → Shows error message
- [ ] Camera disconnects mid-game → Warning overlay

### Hand Tracking
- [ ] One hand visible → Shows warning, pauses counting
- [ ] Hands exit frame → Warning, continues timer
- [ ] Rapid movements → Stability check prevents false counts

### Network
- [ ] Offline during submit → Error message
- [ ] Rate limited → Retry after message
- [ ] Invalid token → Rejection with error

### Duel Mode
- [ ] Link shared before opponent joins → Lobby shows waiting
- [ ] One player disconnects → Timeout handling
- [ ] Both ready simultaneously → Synchronized start

## 🎨 Design Decisions

1. **No Header/Navbar**: Game-first, minimal interface
2. **Glass Morphism**: Translucent overlays for modern look
3. **Green Accent**: Consistent brand color (#4ade80)
4. **Square Camera**: Uniform aspect ratio across devices
5. **Ref-based State**: Performance optimization for frame-rate sensitive updates

## 📱 Browser Support

- Chrome/Edge 80+
- Safari 14+
- Firefox 78+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 8+)

## 🐛 Known Limitations

1. MediaPipe model loads from CDN (initial load time)
2. Realtime sync depends on network latency
3. Custom durations don't appear on leaderboard
4. Maximum 2 players per duel/challenge

## 📄 License

MIT License - feel free to use and modify!

---

Built with ❤️ using Next.js, MediaPipe, and Supabase
