/**
 * Initial data for the /db page (and SEED_ON_START in Docker).
 * All players are fictional; results and predictions are generated deterministically
 * relative to "today", so there are always played matches and upcoming matches to predict.
 */
const User = require('../models/user');
const Club = require('../models/club');
const Player = require('../models/player');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const Comment = require('../models/comment');
const Activity = require('../models/activity');
const { predictionPoints } = require('../utils/scoring');

const MODELS = { users: User, clubs: Club, players: Player, matches: Match, predictions: Prediction, comments: Comment, activities: Activity };

const DAY = 24 * 3600 * 1000;
/** day offset from today at 19:00 (negative = past) */
const at = (days, hour = 19) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const born = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

// deterministic pseudo random so the seed is always the same
let s = 7;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

async function clearDatabase() {
  const counts = {};
  for (const [name, Model] of Object.entries(MODELS)) {
    counts[name] = (await Model.deleteMany({})).deletedCount;
  }
  return counts;
}

async function seedDatabase() {
  s = 7;
  await clearDatabase();

  // ---------- users ----------
  const usersData = [
    { username: 'admin', email: 'admin@handballhub.mk', fullName: 'Admin HandballHub', role: 'admin', country: 'North Macedonia', password: 'Admin1234' },
    { username: 'ana.p', email: 'ana@handballhub.mk', fullName: 'Ana Petrovska', role: 'user', country: 'North Macedonia', password: 'Navivac123' },
    { username: 'stefan.m', email: 'stefan@handballhub.mk', fullName: 'Stefan Mitrevski', role: 'user', country: 'North Macedonia', password: 'Navivac123' },
    { username: 'ivana.k', email: 'ivana@handballhub.mk', fullName: 'Ivana Kostadinova', role: 'user', country: 'North Macedonia', password: 'Navivac123' },
  ];
  const users = [];
  for (const { password, ...u } of usersData) {
    const user = new User({ ...u, emailNotifications: false });
    await user.setPassword(password);
    users.push(await user.save());
  }
  const [admin, ana, stefan, ivana] = users;
  const fans = [ana, stefan, ivana];

  // ---------- clubs ----------
  const clubs = await Club.insertMany([
    { name: 'RK Vardar 1961', city: 'Skopje', country: 'North Macedonia', league: 'Super Liga', founded: 1961, arena: 'Jane Sandanski Arena' },
    { name: 'RK Eurofarm Pelister', city: 'Bitola', country: 'North Macedonia', league: 'Super Liga', founded: 1975, arena: 'Sportska sala Boro Čurlevski' },
    { name: 'RK Alkaloid', city: 'Skopje', country: 'North Macedonia', league: 'Super Liga', founded: 2007, arena: 'SRC Kale' },
    { name: 'RK Ohrid', city: 'Ohrid', country: 'North Macedonia', league: 'Super Liga', founded: 2013, arena: 'Sportska sala Biljanini Izvori' },
    { name: 'RK Struga', city: 'Struga', country: 'North Macedonia', league: 'Super Liga', founded: 1991, arena: 'Sportska sala Struga' },
    { name: 'RK Prilep', city: 'Prilep', country: 'North Macedonia', league: 'Super Liga', founded: 1968, arena: 'Sportska sala Prilep' },
    { name: 'FC Barcelona', city: 'Barcelona', country: 'Spain', league: 'Liga ASOBAL', founded: 1942, arena: 'Palau Blaugrana' },
    { name: 'THW Kiel', city: 'Kiel', country: 'Germany', league: 'Handball-Bundesliga', founded: 1904, arena: 'Wunderino Arena' },
  ]);
  const [vardar, pelister, alkaloid, ohrid, struga, prilep, barca, kiel] = clubs;

  // ---------- players (fictional) ----------
  const P = (firstName, lastName, club, position, jerseyNumber, dob, heightCm, hand = 'right', nationality = 'North Macedonia', notes) => ({
    firstName, lastName, club: club._id, position, jerseyNumber, dateOfBirth: dob, heightCm, hand, nationality, notes, createdBy: admin._id,
  });
  const players = await Player.insertMany([
    P('Bojan', 'Trajkovski', vardar, 'GK', 1, born(1996, 3, 12), 195),
    P('Filip', 'Stojanovski', vardar, 'LB', 7, born(2001, 6, 2), 198, 'right', 'North Macedonia', 'Најдобар стрелец на лигата минатата сезона.'),
    P('Martin', 'Jovanov', vardar, 'RW', 19, born(2003, 11, 20), 184, 'left'),
    P('Aleksandar', 'Ristov', vardar, 'PV', 22, born(1998, 1, 9), 197),
    P('Darko', 'Nikolovski', pelister, 'GK', 16, born(1994, 8, 30), 193),
    P('Marko', 'Angelovski', pelister, 'CB', 10, born(2000, 4, 17), 189),
    P('Igor', 'Petkovski', pelister, 'LW', 5, born(2002, 9, 5), 182),
    P('Viktor', 'Spasovski', pelister, 'PV', 33, born(1997, 12, 1), 199),
    P('Goran', 'Velkovski', alkaloid, 'GK', 12, born(1999, 2, 14), 192),
    P('Stefan', 'Todorov', alkaloid, 'RB', 9, born(2004, 5, 22), 194, 'left', 'North Macedonia', 'Млад леворак со одличен шут од далечина.'),
    P('Dimitar', 'Arsov', alkaloid, 'LW', 3, born(2001, 7, 7), 181),
    P('Hristijan', 'Bogdanov', alkaloid, 'CB', 14, born(1998, 10, 11), 188),
    P('Petar', 'Naumovski', ohrid, 'GK', 1, born(1995, 1, 25), 191),
    P('Kristijan', 'Talevski', ohrid, 'LB', 18, born(2002, 3, 3), 196),
    P('Damjan', 'Pop-Ilievski', ohrid, 'RW', 21, born(2005, 6, 14), 180, 'left'),
    P('Luka', 'Siljanovski', ohrid, 'PV', 44, born(2000, 8, 19), 198),
    P('Ilija', 'Dimovski', struga, 'GK', 16, born(1993, 11, 2), 194),
    P('Blagoj', 'Karanfilov', struga, 'CB', 11, born(1999, 9, 28), 187),
    P('Antonio', 'Gjorgjievski', struga, 'LW', 8, born(2003, 2, 10), 183),
    P('Vasil', 'Mladenov', struga, 'RB', 25, born(2001, 12, 15), 192, 'left'),
    P('Zoran', 'Kitanovski', prilep, 'GK', 12, born(1997, 4, 4), 190),
    P('Nenad', 'Micevski', prilep, 'LB', 6, born(2000, 1, 30), 195),
    P('Toni', 'Ivanovski', prilep, 'RW', 17, born(2004, 10, 8), 182, 'left'),
    P('Jovan', 'Krstevski', prilep, 'PV', 39, born(1998, 6, 21), 197),
    P('Pau', 'Serrano', barca, 'GK', 1, born(1995, 5, 18), 196, 'right', 'Spain'),
    P('Hugo', 'Martín', barca, 'CB', 10, born(1999, 3, 27), 191, 'right', 'Spain'),
    P('Lucas', 'Moreau', barca, 'RB', 19, born(2000, 7, 12), 198, 'left', 'France'),
    P('Jonas', 'Weber', kiel, 'GK', 33, born(1996, 9, 9), 199, 'right', 'Germany'),
    P('Niklas', 'Hoffmann', kiel, 'LB', 4, born(2001, 11, 3), 200, 'right', 'Germany'),
    P('Mads', 'Lindholm', kiel, 'PV', 13, born(1997, 2, 22), 201, 'right', 'Denmark'),
  ]);
  const squad = (club) => players.filter((p) => p.club.equals(club._id));

  // ---------- matches ----------
  // strength decides the generated results (Vardar strongest, Prilep weakest)
  const strength = new Map([[vardar, 6], [pelister, 5], [alkaloid, 3], [ohrid, 2], [struga, 1], [prilep, 0], [barca, 8], [kiel, 7]]
    .map(([c, v]) => [String(c._id), v]));
  const goalsFor = (club, home) => 23 + strength.get(String(club._id)) + (home ? 2 : 0) + int(0, 5);

  function performances(club, score) {
    let left = Math.round(score * 0.7); // the rest of the goals belong to players not in the database
    return squad(club).map((pl) => {
      if (pl.position === 'GK') return { player: pl._id, club: club._id, goals: 0, shots: int(0, 1) ? 1 : 0, saves: int(7, 16), assists: int(0, 2), suspensions: 0 };
      const goals = Math.min(left, int(2, pl.position === 'PV' ? 6 : 9));
      left -= goals;
      return { player: pl._id, club: club._id, goals, shots: goals + int(1, 4), saves: 0, assists: int(0, 6), suspensions: int(0, 2) };
    });
  }

  const SL = [vardar, pelister, alkaloid, ohrid, struga, prilep];
  // round robin (circle method) – [home, away] index pairs per round
  const rounds = [
    [[0, 5], [1, 4], [2, 3]],
    [[4, 0], [3, 5], [1, 2]],
    [[0, 3], [2, 4], [5, 1]],
    [[2, 0], [1, 3], [4, 5]],
    [[0, 1], [5, 2], [3, 4]],
    [[5, 0], [4, 1], [3, 2]],
  ];
  const roundDays = [-23, -16, -9, -2, 5, 12];
  const matchDocs = [];
  rounds.forEach((pairs, r) => pairs.forEach(([h, a], i) => {
    matchDocs.push({ home: SL[h], away: SL[a], date: at(roundDays[r], 18 + i), competition: 'Super Liga', round: r + 1 });
  }));
  matchDocs.push(
    { home: vardar, away: kiel, date: at(-25, 20), competition: 'EHF Champions League', round: 1 },
    { home: barca, away: vardar, date: at(-11, 20), competition: 'EHF Champions League', round: 2 },
    { home: kiel, away: barca, date: at(3, 20), competition: 'EHF Champions League', round: 3 },
    { home: vardar, away: barca, date: at(10, 20), competition: 'EHF Champions League', round: 4 },
  );

  const matches = [];
  for (const d of matchDocs) {
    const played = d.date < new Date();
    const doc = {
      homeClub: d.home._id, awayClub: d.away._id, date: d.date, competition: d.competition, round: d.round,
      venue: d.home.arena, status: played ? 'finished' : 'scheduled',
    };
    if (played) {
      doc.homeScore = goalsFor(d.home, true);
      doc.awayScore = goalsFor(d.away, false);
      doc.performances = [...performances(d.home, doc.homeScore), ...performances(d.away, doc.awayScore)];
    }
    matches.push(await new Match(doc).save());
  }
  const finished = matches.filter((m) => m.status === 'finished');
  const upcoming = matches.filter((m) => m.status === 'scheduled');

  // ---------- predictions ----------
  const predDocs = [];
  for (const m of finished) {
    for (const fan of fans) {
      if (rnd() < 0.2) continue; // not everybody predicts every match
      // fans guess around the real result -> a mix of 0, 2, 3 and 5 points
      const exact = rnd() < 0.15;
      const homeScore = exact ? m.homeScore : Math.max(15, m.homeScore + int(-4, 4));
      const awayScore = exact ? m.awayScore : Math.max(15, m.awayScore + int(-4, 4));
      const pred = { user: fan._id, match: m._id, homeScore, awayScore, createdAt: new Date(m.date.getTime() - int(1, 4) * DAY) };
      pred.points = predictionPoints(pred, m);
      predDocs.push(pred);
    }
  }
  upcoming.slice(0, 5).forEach((m, i) => {
    fans.slice(0, 1 + (i % 3)).forEach((fan) => predDocs.push({
      user: fan._id, match: m._id, homeScore: int(25, 34), awayScore: int(23, 32), points: null, createdAt: at(-int(0, 2), 10),
      note: i === 0 && fan === ana ? 'Домаќинот е во одлична форма.' : undefined,
    }));
  });
  const predictions = await Prediction.insertMany(predDocs);
  // keep the historical createdAt (timestamps would overwrite it)
  await Promise.all(predictions.map((p, i) => Prediction.collection.updateOne({ _id: p._id }, { $set: { createdAt: predDocs[i].createdAt } })));

  // ---------- comments ----------
  const lastPlayed = [...finished].sort((a, b) => b.date - a.date);
  const next = [...upcoming].sort((a, b) => a.date - b.date);
  const comments = await Comment.insertMany([
    { match: lastPlayed[0]._id, author: ana._id, text: 'Одлична атмосфера во салата, голманите беа најдобри на теренот!' },
    { match: lastPlayed[0]._id, author: stefan._id, text: 'Се согласувам, особено во второто полувреме.' },
    { match: lastPlayed[1]._id, author: ivana._id, text: 'Пивотот направи разлика, многу изнудени седмерци.' },
    { match: lastPlayed[1]._id, author: admin._id, text: 'Статистиката од натпреварот е внесена.' },
    { match: lastPlayed[2]._id, author: stefan._id, text: 'Премногу исклучувања од 2 минути, тоа го реши натпреварот.' },
    { match: matches.find((m) => m.competition === 'EHF Champions League' && m.status === 'finished')._id, author: ana._id, text: 'Против Кил одигравме храбро, следниот пат ќе победиме!' },
    { match: next[0]._id, author: ana._id, text: 'Кој ќе победи? Јас мислам дека домаќинот.' },
    { match: next[0]._id, author: ivana._id, text: 'Ќе биде тесно, можеби и нерешено.' },
    { match: next[1]._id, author: stefan._id, text: 'Голем дерби натпревар, салата ќе биде полна.' },
    { match: next[1]._id, author: admin._id, text: 'Прогнозите се отворени до почетокот на натпреварот.' },
  ]);

  // ---------- history ----------
  const clubName = (id) => clubs.find((c) => c._id.equals(id)).name;
  // raw insert keeps the historical createdAt values
  await Activity.collection.insertMany([
    { user: admin._id, action: 'create', entityType: 'Database', description: 'Внесени иницијални податоци', createdAt: new Date() },
    ...finished.map((m) => ({
      user: admin._id, action: 'result', entityType: 'Match', entityId: m._id, createdAt: new Date(m.date.getTime() + 2 * 3600 * 1000),
      description: `Резултат ${clubName(m.homeClub)} ${m.homeScore}:${m.awayScore} ${clubName(m.awayClub)}`,
    })),
    ...predictions.map((p, i) => ({
      user: p.user, action: 'create', entityType: 'Prediction', entityId: p._id, createdAt: predDocs[i].createdAt,
      description: `Прогноза ${clubName(matches.find((m) => m._id.equals(p.match)).homeClub)} – ${clubName(matches.find((m) => m._id.equals(p.match)).awayClub)} ${p.homeScore}:${p.awayScore}`,
    })),
  ]);

  return {
    users: users.length, clubs: clubs.length, players: players.length, matches: matches.length,
    predictions: predictions.length, comments: comments.length,
  };
}

module.exports = { seedDatabase, clearDatabase };
