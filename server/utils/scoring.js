/**
 * Business rules of the prediction game and of the league table.
 *
 * Prediction points (max 5):
 *   correct outcome (home win / draw / away win) .... 2 points
 *   + correct goal difference ........................ 1 point
 *   + exact result ................................... 2 points
 *
 * League table: win = 2 points, draw = 1 point, loss = 0 (handball rules).
 */
const outcome = (home, away) => (home > away ? 'home' : home < away ? 'away' : 'draw');

function predictionPoints(pred, match) {
  if (match.status !== 'finished') return null;
  let points = 0;
  if (outcome(pred.homeScore, pred.awayScore) === outcome(match.homeScore, match.awayScore)) {
    points += 2;
    if (pred.homeScore - pred.awayScore === match.homeScore - match.awayScore) points += 1;
    if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) points += 2;
  }
  return points;
}

const TABLE_POINTS = { win: 2, draw: 1, loss: 0 };

module.exports = { outcome, predictionPoints, TABLE_POINTS };
