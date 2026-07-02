/* modules/game.js
   Pure game-state engine — no DOM here. script.js renders whatever
   this class reports. Keeping the two separate is what makes the
   "modules" folder structure actually mean something. */

import { getFaces } from './themes.js';
import { seededShuffle } from './challenges.js';

export const DIFFICULTIES = {
  easy:   { rows: 4, cols: 4,  label: 'Easy 4×4',    parTimeSec: 45,  timeAttackSec: 60  },
  medium: { rows: 6, cols: 6,  label: 'Medium 6×6',  parTimeSec: 120, timeAttackSec: 120 },
  hard:   { rows: 8, cols: 8,  label: 'Hard 8×8',    parTimeSec: 240, timeAttackSec: 200 },
  expert: { rows: 10, cols: 10, label: 'Expert 10×10', parTimeSec: 420, timeAttackSec: 300 },
};

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class MemoryGame {
  constructor({ difficulty, mode, themeKey, customImages, seed }) {
    this.difficulty = difficulty;
    this.mode = mode; // 'classic' | 'timeAttack' | 'survival' | 'endless'
    this.themeKey = themeKey;
    this.customImages = customImages || [];
    this.seed = seed || null;
    this.lives = 3;
    this.setupBoard();
  }

  setupBoard() {
    const { rows, cols } = DIFFICULTIES[this.difficulty];
    const pairCount = (rows * cols) / 2;
    const faces = getFaces(this.themeKey, pairCount, this.customImages);
    let deck = faces.flatMap((f, i) => [
      { id: `c${i}a`, pairId: i, face: f },
      { id: `c${i}b`, pairId: i, face: f },
    ]);
    deck = this.seed ? seededShuffle(deck, this.seed) : shuffle(deck);
    this.cards = deck.map((c, i) => ({ ...c, index: i, flipped: false, matched: false }));
    this.rows = rows; this.cols = cols;
    this.flippedIndices = [];
    this.pendingMismatch = [];
    this.moves = 0;
    this.mismatches = 0;
    this.matchesFound = 0;
    this.pairCount = pairCount;
    this.combo = 1;
    this.hintsUsed = 0;
    this.score = 0;
    this.powerupsUsed = { hint: false, reveal: false, freeze: false, extraTime: false, shuffle: false };
  }

  /** Returns an event describing what happened, or null if the flip was ignored. */
  flip(index) {
    const card = this.cards[index];
    if (!card || card.flipped || card.matched || this.flippedIndices.length >= 2 || this.pendingMismatch.length) return null;
    card.flipped = true;
    this.flippedIndices.push(index);
    if (this.flippedIndices.length < 2) return { type: 'flip', index };

    this.moves++;
    const [i1, i2] = this.flippedIndices;
    const c1 = this.cards[i1], c2 = this.cards[i2];

    if (c1.pairId === c2.pairId) {
      c1.matched = true; c2.matched = true;
      this.matchesFound++;
      this.combo = Math.min(3, this.combo + 0.5);
      const points = Math.round(100 * this.combo);
      this.score += points;
      this.flippedIndices = [];
      const won = this.matchesFound === this.pairCount;
      return { type: 'match', indices: [i1, i2], points, won };
    } else {
      this.mismatches++;
      this.combo = 1;
      this.pendingMismatch = [i1, i2];
      if (this.mode === 'survival') this.lives = Math.max(0, this.lives - 1);
      return { type: 'mismatch', indices: [i1, i2], livesLeft: this.lives, lost: this.mode === 'survival' && this.lives === 0 };
    }
  }

  /** Called after the UI has shown the mismatched pair briefly. */
  clearPendingMismatch() {
    this.pendingMismatch.forEach(i => { this.cards[i].flipped = false; });
    this.pendingMismatch = [];
    this.flippedIndices = [];
  }

  finalScore({ timeSec }) {
    const { parTimeSec } = DIFFICULTIES[this.difficulty];
    let timeBonus, accuracyBonus;
    if (this.mode === 'timeAttack') {
      timeBonus = Math.max(0, timeSec) * 3; // timeSec here = remaining time
    } else {
      timeBonus = Math.max(0, parTimeSec - timeSec) * 2;
    }
    accuracyBonus = Math.round((this.pairCount / Math.max(1, this.moves)) * 500);
    const total = this.score + timeBonus + accuracyBonus;
    return { matchScore: this.score, timeBonus, accuracyBonus, total };
  }

  /* ---------------- power-ups ---------------- */
  hint() {
    if (this.powerupsUsed.hint) return null;
    const unmatched = this.cards.filter(c => !c.matched);
    if (unmatched.length < 2) return null;
    const pairIdCounts = {};
    unmatched.forEach(c => { pairIdCounts[c.pairId] = (pairIdCounts[c.pairId] || 0) + 1; });
    const pairId = Object.keys(pairIdCounts).find(id => pairIdCounts[id] === 2);
    if (pairId === undefined) return null;
    const indices = this.cards.filter(c => String(c.pairId) === pairId && !c.matched).map(c => c.index);
    this.powerupsUsed.hint = true;
    this.hintsUsed++;
    return { indices };
  }
  revealAll() {
    if (this.powerupsUsed.reveal) return null;
    this.powerupsUsed.reveal = true;
    this.score = Math.max(0, this.score - 50);
    return { indices: this.cards.filter(c => !c.matched).map(c => c.index), penalty: 50 };
  }
  canShuffle() { return !this.powerupsUsed.shuffle; }
  shuffleUnmatched() {
    if (this.powerupsUsed.shuffle) return null;
    this.powerupsUsed.shuffle = true;
    const unmatchedIdx = this.cards.map((c, i) => i).filter(i => !this.cards[i].matched);
    const unmatchedCards = unmatchedIdx.map(i => this.cards[i]);
    const shuffled = shuffle(unmatchedCards);
    unmatchedIdx.forEach((slot, k) => { this.cards[slot] = { ...shuffled[k], index: slot, flipped: false }; });
    this.flippedIndices = [];
    this.pendingMismatch = [];
    return { changed: true };
  }
}
