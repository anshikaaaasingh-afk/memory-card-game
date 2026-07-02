/* script.js — main orchestrator. Imports the modules and drives the DOM;
   the modules themselves stay framework/DOM-agnostic. */

import { loadData, saveData, resetAllData } from './data/storage.js';
import { THEMES, themeLabel, getFaces } from './modules/themes.js';
import { MemoryGame, DIFFICULTIES } from './modules/game.js';
import { GameTimer } from './modules/timer.js';
import { ACHIEVEMENTS, checkAchievements, rankForScore, nextRankInfo } from './modules/achievements.js';
import { computeAnalytics, logSession, suggestNextDifficulty } from './modules/analytics.js';
import { getDailyChallenge, todayKey, recordDailyCompletion } from './modules/challenges.js';
import { playSfx, startAmbientMusic, stopAmbientMusic } from './modules/audio.js';

let data = loadData();
let selectedDifficulty = 'easy';
let selectedMode = 'classic';
let selectedThemeKey = 'animals';

let game = null;
let timer = null;
let isDaily = false;
let endlessRound = 1;
let endlessScore = 0;
let sessionStartedToday = false;

/* ---------------- toast ---------------- */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------------- navigation ---------------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  if (name === 'analytics') renderAnalytics();
  if (name === 'achievements') renderBadges();
  if (name === 'daily') renderDailyScreen();
  if (name === 'settings') renderSettings();
}
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.nav));
});

/* ---------------- theme (dark/light) ---------------- */
function applyAppTheme() {
  document.documentElement.setAttribute('data-theme', data.settings.theme);
  document.getElementById('darkToggle').textContent = data.settings.theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
}
document.getElementById('darkToggle').addEventListener('click', () => {
  data.settings.theme = data.settings.theme === 'dark' ? 'light' : 'dark';
  saveState(); applyAppTheme();
});

function saveState() { saveData(data); }

/* ============================================================
   MENU — difficulty / mode / theme pickers
   ============================================================ */
document.querySelectorAll('#difficultyPicker .pill').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDifficulty = btn.dataset.diff;
    document.querySelectorAll('#difficultyPicker .pill').forEach(b => b.classList.toggle('selected', b === btn));
    playSfx('click', data.settings.sfxOn);
  });
});
document.querySelectorAll('#modePicker .mode-card').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    document.querySelectorAll('#modePicker .mode-card').forEach(b => b.classList.toggle('selected', b === btn));
    playSfx('click', data.settings.sfxOn);
  });
});
function renderThemePicker() {
  const wrap = document.getElementById('themePicker');
  const keys = [...Object.keys(THEMES), 'custom'];
  wrap.innerHTML = keys.map(k => {
    const locked = k === 'custom' && data.settings.customImages.length < 8;
    return `<button class="pill ${k===selectedThemeKey?'selected':''} ${locked?'locked':''}" data-theme-key="${k}" ${locked?'disabled':''}>${themeLabel(k)}${locked?' 🔒':''}</button>`;
  }).join('');
  wrap.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) { showToast('Upload 8+ images in Settings to unlock Custom'); return; }
      selectedThemeKey = btn.dataset.themeKey;
      wrap.querySelectorAll('.pill').forEach(b => b.classList.toggle('selected', b === btn));
      playSfx('click', data.settings.sfxOn);
    });
  });
}
// default selections highlighted on load
document.querySelector('#difficultyPicker .pill[data-diff="easy"]').classList.add('selected');
document.querySelector('#modePicker .mode-card[data-mode="classic"]').classList.add('selected');

document.getElementById('startGameBtn').addEventListener('click', () => {
  isDaily = false;
  startGame({ difficulty: selectedDifficulty, mode: selectedMode, themeKey: selectedThemeKey, seed: null });
});

/* ============================================================
   DAILY CHALLENGE
   ============================================================ */
function renderDailyScreen() {
  const challenge = getDailyChallenge();
  document.getElementById('dailyDesc').textContent =
    `Today's board: ${DIFFICULTIES[challenge.difficulty].label} · ${themeLabel(challenge.themeKey)} theme. Same board for everyone today.`;
  document.getElementById('dailyStreak').textContent = data.dailyChallenge.streak;
  const done = data.dailyChallenge.lastCompletedDate === todayKey();
  document.getElementById('dailyStatus').textContent = done ? 'Completed today ✅ — come back tomorrow to keep your streak' : 'Not completed yet today';
}
document.getElementById('startDailyBtn').addEventListener('click', () => {
  const challenge = getDailyChallenge();
  isDaily = true;
  startGame({ difficulty: challenge.difficulty, mode: 'classic', themeKey: challenge.themeKey, seed: challenge.date });
});

/* ============================================================
   GAME
   ============================================================ */
function startGame({ difficulty, mode, themeKey, seed }) {
  endlessRound = 1;
  endlessScore = 0;
  game = new MemoryGame({ difficulty, mode, themeKey, customImages: data.settings.customImages, seed });
  sessionStartedToday = true;

  document.getElementById('hudLivesWrap').style.display = mode === 'survival' ? 'flex' : 'none';
  document.getElementById('hudTimeLabel').textContent = mode === 'timeAttack' ? 'Time Left' : 'Time';
  document.getElementById('pu-freeze').disabled = mode !== 'timeAttack';
  document.getElementById('pu-extraTime').disabled = mode !== 'timeAttack';
  document.getElementById('pu-hint').disabled = false;
  document.getElementById('pu-reveal').disabled = false;
  document.getElementById('pu-shuffle').disabled = false;

  setupTimerForMode();
  renderBoard();
  updateHud();
  showScreen('game');
}

function setupTimerForMode() {
  if (timer) timer.stop();
  if (game.mode === 'timeAttack') {
    const start = DIFFICULTIES[game.difficulty].timeAttackSec;
    timer = new GameTimer({
      mode: 'down', startSeconds: start,
      onTick: (s) => { document.getElementById('hudTime').textContent = GameTimer.fmt(s); },
      onExpire: () => endGame(false, 'timeout'),
    });
  } else {
    timer = new GameTimer({
      mode: 'up', startSeconds: 0,
      onTick: (s) => { document.getElementById('hudTime').textContent = GameTimer.fmt(s); },
    });
  }
  document.getElementById('hudTime').textContent = GameTimer.fmt(timer.seconds);
  timer.start();
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.style.gridTemplateColumns = `repeat(${game.cols}, 1fr)`;
  boardEl.innerHTML = '';
  game.cards.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'card' + (card.matched ? ' matched' : '');
    el.dataset.index = i;
    const face = typeof card.face === 'object' && card.face.img
      ? `<img src="${card.face.img}" alt="card">`
      : card.face;
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back"></div>
        <div class="card-face card-front">${face}</div>
      </div>`;
    el.addEventListener('click', () => handleCardClick(i));
    boardEl.appendChild(el);
  });
}

function cardEl(index) { return document.querySelector(`.card[data-index="${index}"]`); }

function handleCardClick(index) {
  if (!game) return;
  const event = game.flip(index);
  if (!event) return;

  if (event.type === 'flip') {
    cardEl(index).classList.add('flipped');
    playSfx('flip', data.settings.sfxOn);
  }
  if (event.type === 'match') {
    event.indices.forEach(i => { cardEl(i).classList.add('flipped', 'matched'); });
    playSfx('match', data.settings.sfxOn);
    updateHud();
    if (event.won) { setTimeout(() => onBoardCleared(), 400); }
  }
  if (event.type === 'mismatch') {
    event.indices.forEach(i => { cardEl(i).classList.add('flipped', 'mismatch'); });
    playSfx('mismatch', data.settings.sfxOn);
    updateHud();
    setTimeout(() => {
      event.indices.forEach(i => { const el = cardEl(i); if (el) { el.classList.remove('flipped', 'mismatch'); } });
      game.clearPendingMismatch();
    }, 700);
    if (event.lost) setTimeout(() => endGame(false, 'survival'), 750);
  }
}

function updateHud() {
  document.getElementById('hudMoves').textContent = game.moves;
  document.getElementById('hudScore').textContent = game.score + endlessScore;
  const comboPct = Math.min(100, Math.round(((game.combo - 1) / 2) * 100));
  document.getElementById('comboFill').style.width = comboPct + '%';
  if (game.mode === 'survival') {
    document.getElementById('hudLives').textContent = '❤️'.repeat(game.lives) + '🖤'.repeat(3 - game.lives);
  }
}

function onBoardCleared() {
  if (game.mode === 'endless') {
    endlessScore += game.finalScore({ timeSec: timer.seconds }).total;
    endlessRound++;
    showToast(`Round ${endlessRound - 1} cleared! Next board loading…`);
    const order = ['easy', 'medium', 'hard', 'expert'];
    const bumpEvery = 2;
    const idx = Math.min(order.length - 1, Math.floor((endlessRound - 1) / bumpEvery));
    const nextDifficulty = order[idx];
    game.difficulty = nextDifficulty;
    game.setupBoard();
    renderBoard();
    updateHud();
    return;
  }
  endGame(true, 'cleared');
}

/* quit */
document.getElementById('quitGameBtn').addEventListener('click', () => {
  if (game.mode === 'endless') { endGame(true, 'endless-quit'); return; }
  if (confirm('Quit this game? Your progress on this board won\'t be saved.')) {
    if (timer) timer.stop();
    showScreen('menu');
  }
});

/* ---------------- power-ups ---------------- */
document.getElementById('pu-hint').addEventListener('click', () => {
  const r = game.hint();
  if (!r) { showToast('No hint available'); return; }
  playSfx('powerup', data.settings.sfxOn);
  r.indices.forEach(i => cardEl(i).classList.add('flipped'));
  document.getElementById('pu-hint').disabled = true;
  setTimeout(() => { r.indices.forEach(i => { const el = cardEl(i); if (el && !el.classList.contains('matched')) el.classList.remove('flipped'); }); }, 1000);
});
document.getElementById('pu-reveal').addEventListener('click', () => {
  const r = game.revealAll();
  if (!r) { showToast('Already used this game'); return; }
  playSfx('powerup', data.settings.sfxOn);
  updateHud();
  r.indices.forEach(i => cardEl(i).classList.add('flipped'));
  document.getElementById('pu-reveal').disabled = true;
  setTimeout(() => { r.indices.forEach(i => { const el = cardEl(i); if (el && !el.classList.contains('matched')) el.classList.remove('flipped'); }); }, 1500);
});
document.getElementById('pu-freeze').addEventListener('click', () => {
  if (game.mode !== 'timeAttack' || game.powerupsUsed.freeze) { showToast('Not available'); return; }
  game.powerupsUsed.freeze = true;
  timer.freezeFor(5000);
  playSfx('powerup', data.settings.sfxOn);
  document.getElementById('pu-freeze').disabled = true;
  showToast('🧊 Timer frozen for 5 seconds');
});
document.getElementById('pu-extraTime').addEventListener('click', () => {
  if (game.mode !== 'timeAttack' || game.powerupsUsed.extraTime) { showToast('Not available'); return; }
  game.powerupsUsed.extraTime = true;
  timer.addSeconds(15);
  playSfx('powerup', data.settings.sfxOn);
  document.getElementById('pu-extraTime').disabled = true;
  showToast('⏳ +15 seconds');
});
document.getElementById('pu-shuffle').addEventListener('click', () => {
  const r = game.shuffleUnmatched();
  if (!r) { showToast('Already used this game'); return; }
  playSfx('powerup', data.settings.sfxOn);
  renderBoard();
  document.getElementById('pu-shuffle').disabled = true;
  showToast('🔀 Unmatched cards shuffled');
});

/* ============================================================
   END GAME / RESULTS
   ============================================================ */
function endGame(won, reason) {
  if (timer) timer.stop();
  const timeSec = game.mode === 'timeAttack' ? timer.seconds : timer.seconds;
  const breakdown = game.finalScore({ timeSec });
  const totalScoreThisGame = game.mode === 'endless' ? endlessScore : breakdown.total;

  // update persistent stats
  data.stats.gamesPlayed++;
  if (won) {
    data.stats.gamesWon++;
    if (data.stats.fastestTimeSec === null || timer.seconds < data.stats.fastestTimeSec) {
      if (game.mode !== 'timeAttack') data.stats.fastestTimeSec = timer.seconds;
    }
  }
  data.stats.totalTimeSec += timer.seconds;
  data.stats.totalMoves += game.moves;
  data.stats.bestScore = Math.max(data.stats.bestScore, totalScoreThisGame);
  data.stats.totalScore += Math.max(0, totalScoreThisGame);
  data.stats.hintsUsedEver += game.hintsUsed;

  const result = {
    won, moves: game.moves, mismatches: game.mismatches, timeSec: timer.seconds,
    hintsUsed: game.hintsUsed, score: totalScoreThisGame, pairs: game.pairCount,
    difficulty: game.difficulty, mode: game.mode,
  };
  logSession(data, result);
  const newBadges = checkAchievements(data, result);

  let dailyNote = '';
  if (isDaily && won) {
    const first = recordDailyCompletion(data);
    dailyNote = first ? ` Daily streak is now ${data.dailyChallenge.streak}. 🔥` : ' (already completed today — streak unchanged)';
  }
  saveState();

  newBadges.forEach(b => setTimeout(() => showToast(`🏆 Badge unlocked: ${b.name}`), 400));
  if (data.settings.sfxOn) playSfx(won ? 'win' : 'lose', true);

  renderResults({ won, reason, breakdown, totalScoreThisGame, dailyNote, timeSec: timer.seconds });
  showScreen('results');
}

function renderResults({ won, reason, breakdown, totalScoreThisGame, dailyNote, timeSec }) {
  const titles = {
    cleared: '🎉 You cleared the board!',
    timeout: '⏰ Time ran out',
    survival: '💔 Out of lives',
    'endless-quit': `🏁 Endless run ended — ${endlessRound - 1} round(s) cleared`,
  };
  document.getElementById('resultsTitle').textContent = titles[reason] || (won ? 'Nice work!' : 'Game over');
  document.getElementById('resultsSub').textContent = isDaily ? `Daily Challenge result.${dailyNote}` : `${DIFFICULTIES[game.difficulty].label} · ${game.mode}`;
  document.getElementById('rMoves').textContent = game.moves;
  document.getElementById('rTime').textContent = GameTimer.fmt(timeSec);
  document.getElementById('rScore').textContent = totalScoreThisGame;

  document.getElementById('scoreBreakdown').innerHTML = game.mode === 'endless'
    ? `<div class="breakdown-row"><span>Rounds cleared</span><span>${endlessRound - 1}</span></div>
       <div class="breakdown-row"><span>Total score</span><span>${endlessScore}</span></div>`
    : `<div class="breakdown-row"><span>Match points</span><span>${breakdown.matchScore}</span></div>
       <div class="breakdown-row"><span>Time bonus</span><span>${breakdown.timeBonus}</span></div>
       <div class="breakdown-row"><span>Accuracy bonus</span><span>${breakdown.accuracyBonus}</span></div>
       <div class="breakdown-row"><span>Total</span><span>${breakdown.total}</span></div>`;

  const suggestion = suggestNextDifficulty(data, game.difficulty);
  const panel = document.getElementById('suggestionPanel');
  if (suggestion) {
    panel.style.display = 'block';
    panel.innerHTML = `<h2 class="panel-title">💡 Suggestion</h2><p style="margin:0; font-size:13.5px; color:var(--ink-soft);">${suggestion.reason} Try <b style="color:var(--ink);">${DIFFICULTIES[suggestion.suggestion].label}</b> next.</p>`;
  } else {
    panel.style.display = 'none';
  }
}
document.getElementById('playAgainBtn').addEventListener('click', () => {
  if (isDaily) { showScreen('daily'); return; }
  startGame({ difficulty: selectedDifficulty, mode: selectedMode, themeKey: selectedThemeKey, seed: null });
});
document.getElementById('backToMenuBtn').addEventListener('click', () => showScreen('menu'));

/* ============================================================
   ANALYTICS + BADGES
   ============================================================ */
function renderAnalytics() {
  const a = computeAnalytics(data);
  const rank = rankForScore(a.totalScore);
  const next = nextRankInfo(a.totalScore);
  document.getElementById('rankLine').textContent = next
    ? `Rank: ${rank} — ${next.remaining} pts to ${next.name}`
    : `Rank: ${rank} — top rank reached`;
  const grid = document.getElementById('analyticsGrid');
  const items = [
    ['Games Played', a.gamesPlayed], ['Games Won', a.gamesWon], ['Win Rate', a.winRate + '%'],
    ['Fastest Time', a.fastestTimeSec !== null ? GameTimer.fmt(a.fastestTimeSec) : '—'],
    ['Avg Time', GameTimer.fmt(a.avgTimeSec)], ['Avg Moves', a.avgMoves],
    ['Best Score', a.bestScore], ['Total Score', a.totalScore],
  ];
  grid.innerHTML = items.map(([lbl, val]) => `<div class="stat-box"><div class="num mono">${val}</div><div class="lbl">${lbl}</div></div>`).join('');
}
function renderBadges() {
  document.getElementById('badgeGrid').innerHTML = ACHIEVEMENTS.map(b => {
    const unlocked = data.achievementsUnlocked.includes(b.id);
    return `<div class="badge-card ${unlocked ? 'unlocked' : ''}">
      <div class="badge-emoji">${b.emoji}</div><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>
    </div>`;
  }).join('');
}

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings() {
  document.getElementById('sfxToggle').checked = data.settings.sfxOn;
  document.getElementById('musicToggle').checked = data.settings.musicOn;
  renderCustomPreview();
}
document.getElementById('sfxToggle').addEventListener('change', (e) => { data.settings.sfxOn = e.target.checked; saveState(); });
document.getElementById('musicToggle').addEventListener('change', (e) => {
  data.settings.musicOn = e.target.checked; saveState();
  if (e.target.checked) startAmbientMusic(); else stopAmbientMusic();
});
document.getElementById('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('Notifications aren\'t supported here'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') { showToast('🔔 Reminders enabled'); new Notification('Memory Match', { body: 'We\'ll nudge you if you haven\'t played today.' }); }
  else showToast('Notifications were blocked');
});
setInterval(() => {
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  if (now.getHours() < 20) return;
  if (sessionStartedToday) return;
  new Notification('Memory Match', { body: 'Your daily challenge streak is waiting 🔥' });
}, 120000);

function renderCustomPreview() {
  const wrap = document.getElementById('customImagePreview');
  wrap.innerHTML = data.settings.customImages.map(src => `<img src="${src}">`).join('') || '<span class="muted-note">No images uploaded yet.</span>';
}
document.getElementById('customImageInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files).slice(0, 50 - data.settings.customImages.length);
  let remaining = files.length;
  if (remaining === 0) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      data.settings.customImages.push(reader.result);
      remaining--;
      if (remaining === 0) { saveState(); renderCustomPreview(); renderThemePicker(); showToast('Images added'); }
    };
    reader.readAsDataURL(file);
  });
});
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm('This clears all scores, stats, achievements, and settings. Continue?')) {
    data = resetAllData();
    location.reload();
  }
});

/* ============================================================
   INIT
   ============================================================ */
function init() {
  applyAppTheme();
  renderThemePicker();
  document.querySelector(`#themePicker .pill[data-theme-key="${selectedThemeKey}"]`)?.classList.add('selected');
  renderBadges();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
