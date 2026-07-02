/* modules/achievements.js */

export const ACHIEVEMENTS = [
  { id: 'first_win',    name: 'First Victory',   emoji: '🏆', desc: 'Win your first game' },
  { id: 'five_wins',    name: 'Getting Good',    emoji: '⭐', desc: 'Win 5 games' },
  { id: 'ten_wins',     name: 'Card Shark',      emoji: '🃏', desc: 'Win 10 games' },
  { id: 'under_20',     name: 'Sharp Memory',    emoji: '🧠', desc: 'Win a Medium+ game in under 20 moves' },
  { id: 'under_60s',    name: 'Speed Runner',    emoji: '⚡', desc: 'Win a game in under 60 seconds' },
  { id: 'no_hints',     name: 'All Me',          emoji: '💪', desc: 'Win a game without using a hint' },
  { id: 'perfect',      name: 'Perfect Recall',  emoji: '🎯', desc: 'Win with zero mismatches' },
  { id: 'streak_3',     name: 'Daily Devotion',  emoji: '🔥', desc: '3-day daily challenge streak' },
  { id: 'high_scorer',  name: 'High Scorer',     emoji: '💯', desc: 'Score 2000+ points in a single game' },
  { id: 'grandmaster',  name: 'Grandmaster',     emoji: '👑', desc: 'Reach the Grandmaster rank' },
];

/** result: { won, moves, mismatches, timeSec, hintsUsed, score, pairs, difficulty }
 *  data: the full storage object (post-update) */
export function checkAchievements(data, result) {
  const unlocked = new Set(data.achievementsUnlocked);
  const newly = [];
  const unlock = (id) => { if (!unlocked.has(id)) { unlocked.add(id); newly.push(id); } };

  if (result.won) {
    if (data.stats.gamesWon >= 1) unlock('first_win');
    if (data.stats.gamesWon >= 5) unlock('five_wins');
    if (data.stats.gamesWon >= 10) unlock('ten_wins');
    if (result.moves <= 20 && result.pairs >= 8) unlock('under_20');
    if (result.timeSec <= 60) unlock('under_60s');
    if (result.hintsUsed === 0) unlock('no_hints');
    if (result.mismatches === 0) unlock('perfect');
    if (result.score >= 2000) unlock('high_scorer');
  }
  if (data.dailyChallenge.streak >= 3) unlock('streak_3');
  if (rankForScore(data.stats.totalScore) === 'Grandmaster') unlock('grandmaster');

  data.achievementsUnlocked = Array.from(unlocked);
  return newly.map(id => ACHIEVEMENTS.find(a => a.id === id));
}

const RANKS = [
  { name: 'Beginner', min: 0 },
  { name: 'Intermediate', min: 500 },
  { name: 'Advanced', min: 2000 },
  { name: 'Expert', min: 5000 },
  { name: 'Master', min: 10000 },
  { name: 'Grandmaster', min: 20000 },
];
export function rankForScore(totalScore) {
  let r = RANKS[0].name;
  for (const tier of RANKS) if (totalScore >= tier.min) r = tier.name;
  return r;
}
export function nextRankInfo(totalScore) {
  const idx = RANKS.findIndex(t => t.name === rankForScore(totalScore));
  if (idx === RANKS.length - 1) return null;
  const next = RANKS[idx + 1];
  return { name: next.name, remaining: next.min - totalScore };
}
