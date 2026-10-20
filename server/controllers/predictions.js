const Prediction = require('../models/prediction');
const Match = require('../models/match');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { PATTERNS } = require('../utils/patterns');

const populate = (q) =>
  q.populate('user', 'username fullName')
    .populate({ path: 'match', select: 'homeClub awayClub date competition round status homeScore awayScore', populate: [{ path: 'homeClub', select: 'name' }, { path: 'awayClub', select: 'name' }] });

const title = (m) => `${m.homeClub?.name || '?'} – ${m.awayClub?.name || '?'}`;

/** A prediction can be made / changed only before the match starts. */
function assertOpen(match) {
  if (match.status !== 'scheduled') throw new HttpError(400, 'Натпреварот е веќе одигран – прогнозите се затворени');
  if (match.date <= new Date()) throw new HttpError(400, 'Натпреварот веќе започна – прогнозите се затворени');
}

function buildFilter(query, user) {
  const filter = {};
  if (query.match && PATTERNS.objectId.test(query.match)) filter.match = query.match;
  if (query.user && PATTERNS.objectId.test(query.user)) filter.user = query.user;
  if (query.mine === 'true') {
    if (!user) throw new HttpError(401, 'Потребна е најава');
    filter.user = user._id;
  }
  if (query.scored === 'true') filter.points = { $ne: null };
  if (query.scored === 'false') filter.points = null;
  return filter;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 20);
  const filter = buildFilter(req.query, req.user);
  const sort = req.query.sort === 'points' ? { points: -1, createdAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    populate(Prediction.find(filter).sort(sort).skip(skip).limit(limit)),
    Prediction.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const prediction = await populate(Prediction.findById(req.params.id));
  if (!prediction) throw new HttpError(404, 'Прогнозата не постои');
  res.json(prediction);
});

const create = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.body.match).populate('homeClub awayClub', 'name');
  if (!match) throw new HttpError(400, 'Натпреварот не постои', { match: 'не постои' });
  assertOpen(match);
  if (await Prediction.exists({ user: req.user._id, match: match._id })) {
    throw new HttpError(409, 'Веќе имате прогноза за овој натпревар – изменете ја постоечката');
  }
  const { homeScore, awayScore, note } = req.body;
  const prediction = await Prediction.create({ user: req.user._id, match: match._id, homeScore, awayScore, note });
  logActivity(req.user, 'create', 'Prediction', prediction._id, `Прогноза ${title(match)} ${homeScore}:${awayScore}`);
  res.status(201).json(await populate(Prediction.findById(prediction._id)));
});

const update = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findById(req.params.id);
  if (!prediction) throw new HttpError(404, 'Прогнозата не постои');
  if (String(prediction.user) !== String(req.user._id)) throw new HttpError(403, 'Може да ги менувате само своите прогнози');
  const match = await Match.findById(prediction.match).populate('homeClub awayClub', 'name');
  assertOpen(match);
  ['homeScore', 'awayScore', 'note'].forEach((k) => { if (req.body[k] !== undefined) prediction[k] = req.body[k]; });
  await prediction.save();
  logActivity(req.user, 'update', 'Prediction', prediction._id, `Изменета прогноза ${title(match)} ${prediction.homeScore}:${prediction.awayScore}`);
  res.json(await populate(Prediction.findById(prediction._id)));
});

/** Owner (while the match is not played) or admin (always). */
const remove = asyncHandler(async (req, res) => {
  const prediction = await Prediction.findById(req.params.id);
  if (!prediction) throw new HttpError(404, 'Прогнозата не постои');
  if (!canModify(req.user, prediction.user)) throw new HttpError(403, 'Може да ги бришете само своите прогнози');
  const match = await Match.findById(prediction.match).populate('homeClub awayClub', 'name');
  if (req.user.role !== 'admin' && match) assertOpen(match);
  await prediction.deleteOne();
  logActivity(req.user, 'delete', 'Prediction', prediction._id, `Избришана прогноза ${match ? title(match) : ''}`);
  res.status(204).end();
});

/** Ranking of users by total prediction points. */
async function leaderboardData() {
  return Prediction.aggregate([
    {
      $group: {
        _id: '$user',
        points: { $sum: { $ifNull: ['$points', 0] } },
        predictions: { $sum: 1 },
        scored: { $sum: { $cond: [{ $ne: ['$points', null] }, 1, 0] } },
        exact: { $sum: { $cond: [{ $eq: ['$points', 5] }, 1, 0] } },
        correct: { $sum: { $cond: [{ $gte: ['$points', 2] }, 1, 0] } },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    {
      $project: {
        username: '$u.username', fullName: '$u.fullName', points: 1, predictions: 1, scored: 1, exact: 1, correct: 1,
        accuracy: { $cond: [{ $gt: ['$scored', 0] }, { $round: [{ $multiply: [{ $divide: ['$correct', '$scored'] }, 100] }, 0] }, null] },
      },
    },
    { $sort: { points: -1, exact: -1, correct: -1, username: 1 } },
  ]).then((rows) => rows.map((r, i) => ({ rank: i + 1, ...r })));
}

const leaderboard = asyncHandler(async (_req, res) => res.json(await leaderboardData()));

/** GET /api/predictions/leaderboard.csv – report generation (CSV download) */
const leaderboardCsv = asyncHandler(async (_req, res) => {
  const rows = await leaderboardData();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Место', 'Корисник', 'Име', 'Поени', 'Прогнози', 'Бодирани', 'Точен резултат', 'Точен победник', 'Успешност %'];
  const lines = rows.map((r) => [r.rank, r.username, r.fullName, r.points, r.predictions, r.scored, r.exact, r.correct, r.accuracy].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="handballhub-rang-lista-${Date.now()}.csv"`);
  res.send(`﻿${header.map(esc).join(',')}\n${lines.join('\n')}`);
});

module.exports = { list, getOne, create, update, remove, leaderboard, leaderboardCsv, leaderboardData };
