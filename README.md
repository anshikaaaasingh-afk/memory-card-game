# 🃏 Memory Match — Ultimate Card Game

A full-featured memory card game built with plain HTML, CSS, and JavaScript — no framework, no backend, no build step. Difficulty levels, four game modes, five power-ups, achievements, daily challenges, analytics, and a PWA install option, all running client-side.

**[Live demo →](#)** *(add your GitHub Pages link once deployed)*

## What's actually in here vs. what's out of scope

This started from a very long feature wishlist that included a few things that genuinely need a server (multiplayer, a global leaderboard, push notifications, user accounts). Being upfront about the trade-offs made:

| Requested | What's built |
|---|---|
| Multiplayer / global leaderboard / friend challenges / profiles | **Not included** — needs a backend. `bestScore` and rank are tracked locally per-device instead. |
| Push notifications | **Simplified** to opt-in local browser notifications ("come back and play"), not real push (which needs a server to trigger while the app is closed). |
| AI opponent / personalized recommendations | **Simplified** to a transparent heuristic (`suggestNextDifficulty` in `analytics.js`) that suggests a harder or easier board based on your last 3 games. It's rule-based, not a model — the code says exactly why it suggests what it suggests. |
| Daily challenge with a leaderboard | **Simplified** to a seeded daily board (everyone who opens the app on the same date gets the same shuffle) with a local streak counter — no synced leaderboard. |
| Everything else on the list | Built and working: difficulty levels, 4 game modes, scoring with combo multiplier/time/accuracy bonuses, streaks, achievements, Chart-free analytics dashboard, dark/light + glassmorphism UI, 6 emoji themes + custom image upload, 5 power-ups, PWA install, synthesized sound (no audio files needed). |

## Features

**Core gameplay** — card matching, 3D flip animation, move counter, timer, win/lose screens, restart

**Difficulty levels** — Easy 4×4, Medium 6×6, Hard 8×8, Expert 10×10

**Game modes**
- **Classic** — clear the board at your own pace
- **Time Attack** — countdown timer, beat the clock
- **Survival** — 3 mismatches and it's over
- **Endless** — clear a board, immediately get a harder one, score stacks across rounds until you quit

**Scoring** — points per match with a combo multiplier (resets on a mismatch), a time bonus, and an accuracy bonus (pairs found ÷ moves made)

**Power-ups** (one use each per game) — Hint, Reveal All, Freeze Timer (Time Attack only), +15s (Time Attack only), Shuffle unmatched cards

**Persistence** — all scores, settings, achievements, and stats saved to `localStorage`

**Themes** — Animals, Space, Programming, Sports, Food, Countries (all emoji, zero image assets), plus a Custom theme that unlocks once you upload 8+ images in Settings

**Achievements** — 10 badges covering wins, speed, accuracy, streaks, and score milestones

**Analytics dashboard** — games played/won, win rate, fastest time, averages, best score, rank (Beginner → Grandmaster)

**Daily challenge** — same seeded board for everyone on a given date, with a local streak counter

**Sound** — every effect (flip, match, mismatch, win, lose, power-up) is a synthesized Web Audio tone, plus an optional ambient pad loop — no `.mp3`/`.wav` files in the repo

**PWA** — installable on mobile via `manifest.json` + `sw.js`, works offline for the app shell

## Project structure

```
memory-card-game/
├── index.html
├── style.css
├── script.js              # orchestrator: DOM, navigation, game loop
├── manifest.json
├── sw.js
├── icon-192.svg / icon-512.svg
│
├── modules/
│   ├── game.js             # board setup, flip logic, scoring, power-ups (DOM-agnostic)
│   ├── timer.js             # count up/down, pause, freeze
│   ├── themes.js            # emoji sets + custom-image theme
│   ├── achievements.js      # badge definitions + rank system
│   ├── analytics.js         # stats aggregation + difficulty suggestion
│   └── challenges.js        # seeded daily-challenge board + streaks
│
├── data/
│   └── storage.js           # localStorage read/write, single source of truth for the data shape
│
└── assets/                  # kept empty on purpose — see note in each folder's .gitkeep
```

## Running locally

```bash
cd memory-card-game
python -m http.server 8000
# open http://localhost:8000
```

`script.js` uses ES module imports, which most browsers block on `file://` — serve it over `http://` (any static server works).

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo
2. **Settings → Pages** → source = your default branch, root folder
3. Live at `https://<username>.github.io/<repo-name>/`

## Honest next steps if you want to go further

- Swap `localStorage` for a small backend (Firebase, Supabase, or a tiny Express API) to unlock real multiplayer and a global leaderboard
- Add a Web Push subscription + a server to send real push notifications
- Replace the heuristic difficulty suggestion with an actual model call if you want genuine adaptive difficulty
# memory-card-game
