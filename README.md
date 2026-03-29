<div align="center">
  <img src="public/brain-digits-logo.png" alt="BrainDigits Logo" width="200" />
  <h1>🧠 BrainDigits</h1>
  <p><strong>The Ultimate Multiplayer Number Guessing Arena</strong></p>
  
  <p>
    <a href="https://braindigits.vercel.app"><b>Play Now</b></a> •
    <a href="#-features">Features</a> •
    <a href="#-how-to-play">How to Play</a> •
    <a href="#%EF%B8%8F-tech-stack">Tech Stack</a>
  </p>
</div>

---

**BrainDigits** is a highly interactive, fast-paced online multiplayer number guessing game. Designed with a sleek, premium Web3-inspired glassmorphic UI, players can compete in real-time against friends or challenge a smart offline AI bot. The rules are simple, but the competition is fierce: use logical deduction to deduce the hidden number before your opponent does!

![BrainDigits Preview](https://imglink.cc/i/ccCdYmCDE9)

## 🚀 Features

### 👤 Premium Gamified Profiles
- **Secure Authentication**: Register and log in using Supabase-powered custom authentication.
- **Dynamic Tier Ranks**: Grind through matches to climb the ranks from *Rookie* all the way to *Legend* tier. The UI dynamically evolves colors and badges based on your global standing.
- **Custom Avatars**: Choose from curated retro arcade emojis or seamlessly upload and instantly crop your own custom profile picture right from the dashboard.
- **Advanced Stat Tracking**: All your played games, wins against AI, PvP victories, and your Global Accuracy Percentage are securely tracked and displayed.
- **Guest Mode**: Just want to play? Jump right into the action instantly as a guest without signing up!

### 🌍 Social Network & Leaderboards
- **Global Hall of Fame**: Check the top-tier players around the globe via the real-time competitive leaderboard, split dynamically into *PvP Masters* and *AI Slayers*.
- **Active Friends List**: Add other players to your Friends List functionality backed by robust Supabase network requests.
- **Live In-Game Invites**: See exactly who is online in real-time. Send and receive instant live push notifications to immediately pull friends into your private lobbies!

### ⚙️ Deeply Customizable Rules & Gameplay
- **Dynamic Number Ranges**: Choose from presets (1-100, 1-500, 1-1000) or specify a completely custom maximum boundary to tune the difficulty.
- **Turn Timers**: Add sweat-inducing pressure to your matches by enabling custom strict time limits per guess (e.g., 10s, 15s).
- **❤️ Hearts & Lives System**: Enable a punishing Lives System where failing to guess within the time limit docks a heart. Lose all your hearts, and you forfeit the round!

### 💡 Interactive Feedback
- **Math Logic Hints**: Receive instant feedback ("Higher" or "Lower") immediately after every guess to systematically narrow down your options.
- **Independent Audio Systems**: High-quality embedded retro arcade looping soundtracks and synthesized SFX (clicks, bells, buzzers). Music and SFX can be muted/played completely independently and persist through sessions.
- **Turn-Based Action**: Fast, low-latency, organized rounds orchestrated via Supabase real-time Websockets, bolstered by a heavily fortified and crash-proof React concurrent mounting logic.

### 🎨 Premium Aesthetics
- **Sleek UI/UX**: Beautiful deep dark mode paired with neon brights (Cyan & Purple), dynamic ambient glowing backgrounds, smooth glassmorphism, and responsive micro-animations.
- **Mobile Responsive**: Play flawlessly on any device, from ultrawide desktop monitors to mobile phones.

---

## 🕹️ How to Play

1. **Visit the Arena**: Open [BrainDigits](https://braindigits.vercel.app).
2. **Authenticate**: *Sign In* to track your stats and access the social tab, or choose *Play as Guest*.
3. **Choose your Mode**: Select *Play with Friends* or *Play with AI*.
4. **Configure Settings**: Click the Settings gear to adjust the Max Number Range, Turn Timer, Lives System, or configure the independent Music and SFX.
5. **Socialize or Join**: Open your Friends List to send a direct Live Invite, enter a 5-character room code to join an existing game, or create a brand new room.
6. **Guess!**: When it's your turn, submit your numerical deduction. Use the "Higher/Lower" telemetry to guide your next move.
7. **Win**: The first player to correctly guess the target number wins the round and earns a point on the global leaderboard!

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — Component-driven architecture
- **TypeScript** — Strongly typed and reliable
- **Vite** — Lightning-fast build and dev server
- **Tailwind CSS** — Utility-first styling for the neon aesthetics
- **Lucide React** — Beautiful vector icons
- **React Query** — Server-state management and aggressive high-performance caching.

### Backend / Real-time Integration
- **Supabase** — Backend-as-a-Service powering the secure Custom Auth, PostgreSQL querying, Storage optimization, and heavily tuned Real-time Multiplayer Synchronization via Channels/Presence.

### Tools & Testing
- **ESLint & PostCSS** — Code quality and style processing
- **Vercel** — Fast, global hosting and high-availability deployment

---

<div align="center">
  <p>Developed with ❤️ by <strong>Apurba Mallik</strong></p>
  <p>
    <a href="https://github.com/apurbamallik">GitHub</a> • 
    <a href="https://x.com/_apurbamallik">Twitter</a> • 
    <a href="https://www.linkedin.com/in/apurbamallik/">LinkedIn</a>
  </p>
</div>

