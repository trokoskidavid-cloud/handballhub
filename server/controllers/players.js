const mongoose = require('mongoose');
const Player = require('../models/player');
const Match = require('../models/match');
const Club = require('../models/club');
const { HttpError, asyncHandler, pagination, escapeRegex } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { POSITIONS, HANDS } = require('../utils/patterns');

const FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'position', 'jerseyNumber', 'hand',
  'heightCm', 'club', 'photoUrl', 'notes'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? undefined : body[k]]));

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

// Macedonian Cyrillic -> Latin, so "Стојановски" also finds "Stojanovski"
const CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dj', ш: 'sh' };
const toLatin = (str) => str.toLowerCase().split('').map((ch) => CYR[ch] ?? ch).join('');

const SORTS = {
  name: { lastName: 1, firstName: 1 },
  goals: { goals: -1, lastName: 1 },
  age: { dateOfBirth: -1 },
  height: { heightCm: -1 },
  newest: { createdAt: -1 },
};

/** Season statistics of every player, computed from the dependent Matches collection. */
const statsLookup = {
  $lookup: {
    from: 'matches',
    let: { pid: '$_id' },
    pipeline: [
      { $match: { status: 'finished' } },
      { $unwind: '$performances' },
      { $match: { $expr: { $eq: ['$performances.player', '$$pid'] } } },
      {
        $group: {
          _id: null,
          appearances: { $sum: 1 },
          goals: { $sum: '$performances.goals' },
          shots: { $sum: '$performances.shots' },
          saves: { $sum: '$performances.saves' },
        },
      },
    ],
    as: 'season',
  },
};
const statsFields = [
  statsLookup,
  { $unwind: { path: '$season', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      appearances: { $ifNull: ['$season.appearances', 0] },
      goals: { $ifNull: ['$season.goals', 0] },
      shots: { $ifNull: ['$season.shots', 0] },
      saves: { $ifNull: ['$season.saves', 0] },
    },
  },
  { $project: { season: 0 } },
];

/**
 * GET /api/players – list with filtering, sorting and pagination.
 * appearances / goals / shots / saves are computed from the finished matches.
 */
const list = asyncHandler(async (req, res) => {
  const { q, position, nationality, club, hand, minAge, maxAge, minHeight, minGoals, sort } = req.query;
  const { page, limit, skip } = pagination(req.query);
  const match = {};

  if (q && String(q).trim()) {
    const terms = [...new Set([String(q).trim(), toLatin(String(q).trim())])];
    const rxs = terms.map((t) => new RegExp(escapeRegex(t), 'i'));
    const clubs = await Club.find({ $or: rxs.flatMap((rx) => [{ name: rx }, { city: rx }]) }).select('_id');
    match.$or = [
      ...rxs.flatMap((rx) => [{ firstName: rx }, { lastName: rx }, { nationality: rx }]),
      ...(clubs.length ? [{ club: { $in: clubs.map((c) => c._id) } }] : []),
    ];
  }
  if (position) {
    const list = String(position).split(',').filter((p) => POSITIONS.includes(p));
    if (list.length) match.position = { $in: list };
  }
  if (hand && HANDS.includes(hand)) match.hand = hand;
  if (nationality) match.nationality = new RegExp(`^${escapeRegex(String(nationality))}$`, 'i');
  if (club && mongoose.isValidObjectId(club)) match.club = new mongoose.Types.ObjectId(club);
  if (minHeight) match.heightCm = { $gte: Number(minHeight) };
  if (minAge || maxAge) {
    match.dateOfBirth = {};
    if (minAge) match.dateOfBirth.$lte = new Date(Date.now() - Number(minAge) * YEAR_MS);
    if (maxAge) match.dateOfBirth.$gt = new Date(Date.now() - (Number(maxAge) + 1) * YEAR_MS);
  }

  const pipeline = [{ $match: match }, ...statsFields];
  if (minGoals) pipeline.push({ $match: { goals: { $gte: Number(minGoals) } } });

  const [result] = await Player.aggregate([
    ...pipeline,
    {
      $facet: {
        items: [
          { $sort: SORTS[sort] || SORTS.name },
          { $skip: skip },
          { $limit: limit },
          { $lookup: { from: 'clubs', localField: 'club', foreignField: '_id', as: 'club' } },
          { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ]);
  const total = result.total[0]?.n || 0;
  res.json({ items: result.items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id).populate('club').populate('createdBy', 'username');
  if (!player) throw new HttpError(404, 'Играчот не постои');
  res.json(player);
});

/** GET /api/players/:id/stats – season totals and per-match timeline */
const stats = asyncHandler(async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params.id);
  const matches = await Match.find({ status: 'finished', 'performances.player': id })
    .sort({ date: 1 })
    .populate('homeClub', 'name')
    .populate('awayClub', 'name');
  const timeline = matches.map((m) => {
    const p = m.performances.find((x) => x.player.equals(id));
    return {
      matchId: m._id, date: m.date, competition: m.competition,
      label: `${m.homeClub?.name} ${m.homeScore}:${m.awayScore} ${m.awayClub?.name}`,
      goals: p.goals, shots: p.shots, assists: p.assists, saves: p.saves, suspensions: p.suspensions,
    };
  });
  const sum = (k) => timeline.reduce((s, t) => s + (t[k] || 0), 0);
  const goals = sum('goals');
  const shots = sum('shots');
  res.json({
    appearances: timeline.length,
    goals,
    shots,
    assists: sum('assists'),
    saves: sum('saves'),
    suspensions: sum('suspensions'),
    shootingPct: shots ? Math.round((goals / shots) * 100) : null,
    goalsPerMatch: timeline.length ? Math.round((goals / timeline.length) * 10) / 10 : null,
    timeline,
  });
});

const create = asyncHandler(async (req, res) => {
  const player = await Player.create({ ...pick(req.body), createdBy: req.user._id });
  logActivity(req.user, 'create', 'Player', player._id, `Додаден играч ${player.fullName}`);
  res.status(201).json(player);
});

/** Admin or the user who added the player can edit it. */
const update = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) throw new HttpError(404, 'Играчот не постои');
  if (!canModify(req.user, player.createdBy)) throw new HttpError(403, 'Може да ги уредувате само играчите што сте ги додале');
  const data = pick(req.body);
  if (req.body.club === '') player.club = undefined; // free agent
  player.set(data);
  await player.save();
  logActivity(req.user, 'update', 'Player', player._id, `Ажуриран играч ${player.fullName}`);
  res.json(player);
});

/** Admin only – also removes the player's statistics from the matches. */
const remove = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) throw new HttpError(404, 'Играчот не постои');
  const { modifiedCount } = await Match.updateMany({ 'performances.player': player._id }, { $pull: { performances: { player: player._id } } });
  await player.deleteOne();
  logActivity(req.user, 'delete', 'Player', player._id, `Избришан играч ${player.fullName} (статистика од ${modifiedCount} натпревари)`);
  res.status(204).end();
});

/** GET /api/players/:id/dependencies – how many matches hold the player's statistics (for the confirm modal) */
const dependencies = asyncHandler(async (req, res) => {
  const matches = await Match.countDocuments({ 'performances.player': req.params.id });
  res.json({ matches });
});

module.exports = { list, getOne, stats, create, update, remove, dependencies, statsFields };
