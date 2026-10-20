/**
 * League table, computed from the finished matches (it is never stored, so it is always up to date).
 * Handball rules: win = 2 points, draw = 1, loss = 0.
 * Order: points, goal difference, goals scored, name.
 */
const Match = require('../models/match');
const Club = require('../models/club');
const { TABLE_POINTS } = require('../utils/scoring');

async function computeStandings(competition) {
  const filter = { status: 'finished' };
  if (competition) filter.competition = competition;
  const matches = await Match.find(filter).sort({ date: 1 })
    .populate('homeClub', 'name city logoUrl')
    .populate('awayClub', 'name city logoUrl');

  const rows = new Map();
  const row = (club) => {
    const key = String(club._id);
    if (!rows.has(key)) {
      rows.set(key, {
        club: { _id: club._id, name: club.name, city: club.city, logoUrl: club.logoUrl },
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, form: [],
      });
    }
    return rows.get(key);
  };

  // clubs registered in this league appear even before their first match
  if (competition) {
    const leagueClubs = await Club.find({ league: competition }).select('name city logoUrl');
    leagueClubs.forEach(row);
  }

  for (const m of matches) {
    if (!m.homeClub || !m.awayClub) continue;
    const sides = [[row(m.homeClub), m.homeScore, m.awayScore], [row(m.awayClub), m.awayScore, m.homeScore]];
    for (const [r, scored, conceded] of sides) {
      const result = scored > conceded ? 'win' : scored < conceded ? 'loss' : 'draw';
      r.played += 1;
      r.goalsFor += scored;
      r.goalsAgainst += conceded;
      r.points += TABLE_POINTS[result];
      if (result === 'win') r.won += 1;
      else if (result === 'draw') r.drawn += 1;
      else r.lost += 1;
      r.form.push(result[0].toUpperCase()); // W / D / L
    }
  }

  return [...rows.values()]
    .map((r) => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst, form: r.form.slice(-5) }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.club.name.localeCompare(b.club.name))
    .map((r, i) => ({ position: i + 1, ...r }));
}

module.exports = { computeStandings };
