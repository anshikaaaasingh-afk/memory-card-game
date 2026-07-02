/* modules/analytics.js */

export function logSession(data, result) {
  data.sessionLog.unshift({
    date: new Date().toISOString(),
    won: result.won, moves: result.moves, timeSec: result.timeSec,
    score: result.score, difficulty: result.difficulty, mode: result.mode
  });
  data.sessionLog = data.sessionLog.slice(0, 50);
}

export function computeAnalytics(data) {
  const s = data.stats;
  const winRate = s.gamesPlayed ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
  const avgTime = s.gamesWon ? Math.round(data.sessionLog.filter(x=>x.won).reduce((a,x)=>a+x.timeSec,0) / Math.max(1, data.sessionLog.filter(x=>x.won).length)) : 0;
  const avgMoves = s.gamesWon ? Math.round(data.sessionLog.filter(x=>x.won).reduce((a,x)=>a+x.moves,0) / Math.max(1, data.sessionLog.filter(x=>x.won).length)) : 0;
  return {
    gamesPlayed: s.gamesPlayed,
    gamesWon: s.gamesWon,
    winRate,
    fastestTimeSec: s.fastestTimeSec,
    avgTimeSec: avgTime,
    avgMoves,
    bestScore: s.bestScore,
    totalScore: s.totalScore
  };
}

/** Simple heuristic ("adaptive difficulty") — not a real model, just a
 *  transparent rule based on recent performance. */
export function suggestNextDifficulty(data, currentDifficulty) {
  const order = ['easy','medium','hard','expert'];
  const idx = order.indexOf(currentDifficulty);
  const recent = data.sessionLog.slice(0, 3).filter(x => x.difficulty === currentDifficulty);
  if (recent.length === 0) return null;
  const avgMoves = recent.reduce((a,x)=>a+x.moves,0) / recent.length;
  const allWon = recent.every(x => x.won);
  if (allWon && avgMoves < 30 && idx < order.length - 1) {
    return { suggestion: order[idx+1], reason: 'You\'ve been winning fast — try a bigger board.' };
  }
  if (!allWon && idx > 0) {
    return { suggestion: order[idx-1], reason: 'This size has been tough lately — try stepping down.' };
  }
  return null;
}
