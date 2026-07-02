/* data/storage.js
   Thin wrapper around localStorage. Every other module reads/writes
   through here so the storage shape only lives in one place. */

const KEY = 'memoryGame_v1';

function defaultData() {
  return {
    settings: {
      theme: 'dark',            // 'dark' | 'light'
      cardTheme: 'animals',      // animals | space | programming | sports | food | countries | custom
      musicOn: false,
      sfxOn: true,
      customImages: []           // base64 strings uploaded by the user
    },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      fastestTimeSec: null,
      totalTimeSec: 0,
      totalMoves: 0,
      bestScore: 0,
      totalScore: 0,
      hintsUsedEver: 0
    },
    achievementsUnlocked: [],     // array of achievement ids
    highScores: [],               // [{score, mode, difficulty, date}]
    dailyChallenge: {
      lastCompletedDate: null,
      streak: 0
    },
    sessionLog: []                // recent game results, capped at 50, feeds analytics
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // shallow-merge so new fields introduced later don't break old saves
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      stats: { ...base.stats, ...parsed.stats },
      dailyChallenge: { ...base.dailyChallenge, ...parsed.dailyChallenge }
    };
  } catch (e) {
    return defaultData();
  }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetAllData() {
  localStorage.removeItem(KEY);
  return defaultData();
}
