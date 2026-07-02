/* modules/challenges.js
   A "daily challenge" needs the same board for every player on a given
   day. There's no server here, so it's simulated with a seeded PRNG:
   the date string is the seed, so anyone playing on the same date (and
   the same player across a refresh) gets the same shuffle. This is
   honestly a local simulation, not a synced global challenge — noted
   in the README. */

function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Returns a deterministic {difficulty, themeKey, seededShuffle} for today. */
export function getDailyChallenge() {
  const key = todayKey();
  const rng = seededRandom(key);
  const difficulties = ['easy','medium','hard'];
  const themes = ['animals','space','programming','sports','food','countries'];
  const difficulty = difficulties[Math.floor(rng() * difficulties.length)];
  const themeKey = themes[Math.floor(rng() * themes.length)];
  return { date: key, difficulty, themeKey, shuffle: (arr) => seededShuffle(arr, key) };
}

export function seededShuffle(arr, seedStr) {
  const rng = seededRandom(seedStr);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function recordDailyCompletion(data) {
  const key = todayKey();
  if (data.dailyChallenge.lastCompletedDate === key) return false; // already done today
  const yesterday = new Date(Date.now() - 86400000);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  data.dailyChallenge.streak = (data.dailyChallenge.lastCompletedDate === yKey) ? data.dailyChallenge.streak + 1 : 1;
  data.dailyChallenge.lastCompletedDate = key;
  return true;
}
