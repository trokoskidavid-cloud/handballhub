const Match = require('../models/match');
const Prediction = require('../models/prediction');
const Comment = require('../models/comment');
const Player = require('../models/player');
const { HttpError, asyncHandler, pagination } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');
const { PATTERNS, MATCH_STATUSES } = require('../utils/patterns');
const { predictionPoints, outcome } = require('../utils/scoring');

const FIELDS = ['homeClub', 'awayClub', 'date', 'competition', 'round', 'venue', 'status', 'homeScore', 'awayScore', 'performances'];
const pick = (body) => Object.fromEntries(FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? undefined : body[k]]));

const populate = (q) =>
  q.populate('homeClub', 'name city logoUrl')
    .populate('awayClub', 'name city logoUrl')
    .populate('performances.player', 'firstName lastName position jerseyNumber club')
    .populate('predictionCount')
    .populate('commentCount');

/**
 * Players in performances must exist, belong to one of the two clubs and appear only once.
 * The player's club is stored in the performance, so the statistics stay correct after a transfer.
 */
async function checkPerformances(perfs, homeClub, awayClub) {
  if (perfs === undefined) return;
  if (!Array.isArray(perfs)) throw new HttpError(400, 'performances мора да е низа');
  const ids = perfs.map((p, i) => {
    if (!PATTERNS.objectId.test(String(p.player))) throw new HttpError(400, `performances[${i}].player е невалиден`);
    return String(p.player);
  });
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'Играчот е внесен повеќе пати во ист натпревар');
  const players = await Player.find({ _id: { $in: ids } }).select('club');
  if (players.length !== ids.length) throw new HttpError(400, 'Некој од играчите не постои');
  const allowed = [String(homeClub), String(awayClub)];
  const clubOf = Object.fromEntries(players.map((p) => [String(p._id), String(p.club)]));
  perfs.forEach((p) => {
    // a player who already has statistics in this match keeps the club he played for
    const club = p.club && allowed.includes(String(p.club)) ? String(p.club) : clubOf[String(p.player)];
    if (!allowed.includes(club)) throw new HttpError(400, 'Статистика може да се внесе само за играчи од двата клуба');
    p.club = club;
  });
}

/**
 * Business rule: when a match is finished, every prediction gets its points (0–5)
 * and the user is notified by e-mail.
 */
async function scorePredictions(match) {
  const preds = await Prediction.find({ match: match._id }).populate('user', 'username email emailNotifications');
  await Promise.all(preds.map(async (p) => {
    p.points = predictionPoints(p, match);
    await p.save();
    if (match.status === 'finished' && p.user?.emailNotifications) {
      sendMail({ to: p.user.email, ...templates.predictionScored(p.user, p, match) });
    }
  }));
  return preds.length;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, 20);
  const filter = {};
  if (req.query.club && PATTERNS.objectId.test(req.query.club)) {
    filter.$or = [{ homeClub: req.query.club }, { awayClub: req.query.club }];
  }
  if (MATCH_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.competition) filter.competition = String(req.query.competition);
  if (req.query.round && /^\d{1,2}$/.test(String(req.query.round))) filter.round = Number(req.query.round);
  // upcoming matches: soonest first; results: newest first
  const sort = req.query.status === 'scheduled' ? { date: 1 } : { date: -1 };
  const [items, total] = await Promise.all([
    populate(Match.find(filter).sort(sort).skip(skip).limit(limit)),
    Match.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

/** GET /api/matches/competitions – names for filters */
const competitions = asyncHandler(async (_req, res) => {
  res.json((await Match.distinct('competition')).sort());
});

/** GET /api/matches/:id – match with prediction summary (distribution of predicted outcomes) */
const getOne = asyncHandler(async (req, res) => {
  const match = await populate(Match.findById(req.params.id));
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  const preds = await Prediction.find({ match: match._id });
  const summary = { home: 0, draw: 0, away: 0, total: preds.length, avgHome: null, avgAway: null };
  preds.forEach((p) => { summary[outcome(p.homeScore, p.awayScore)] += 1; });
  if (preds.length) {
    summary.avgHome = Math.round((preds.reduce((s, p) => s + p.homeScore, 0) / preds.length) * 10) / 10;
    summary.avgAway = Math.round((preds.reduce((s, p) => s + p.awayScore, 0) / preds.length) * 10) / 10;
  }
  res.json({ ...match.toJSON(), predictionSummary: summary });
});

const create = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  await checkPerformances(data.performances, data.homeClub, data.awayClub);
  const match = await Match.create(data);
  logActivity(req.user, 'create', 'Match', match._id, `Внесен натпревар (${match.competition}${match.round ? `, коло ${match.round}` : ''})`);
  res.status(201).json(await populate(Match.findById(match._id)));
});

const update = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  const data = pick(req.body);
  await checkPerformances(data.performances, data.homeClub || match.homeClub, data.awayClub || match.awayClub);
  match.set(data);
  // predictions are (re)scored only when the result really changed – not when e.g. the venue is edited
  const resultChanged = ['status', 'homeScore', 'awayScore'].some((k) => match.isModified(k));
  await match.save();
  if (resultChanged) await scorePredictions(await Match.findById(match._id).populate('homeClub awayClub', 'name'));
  logActivity(req.user, 'update', 'Match', match._id, `Ажуриран натпревар (${match.competition})`);
  res.json(await populate(Match.findById(match._id)));
});

/**
 * PUT /api/matches/:id/result – enter the final score and the player statistics.
 * The match becomes "finished" and all predictions are scored.
 */
const setResult = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id).populate('homeClub awayClub', 'name');
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  const performances = req.body.performances ?? [];
  await checkPerformances(performances, match.homeClub._id, match.awayClub._id);
  match.set({ status: 'finished', homeScore: req.body.homeScore, awayScore: req.body.awayScore, performances });
  await match.save();
  const scored = await scorePredictions(match);
  logActivity(req.user, 'result', 'Match', match._id,
    `Резултат ${match.homeClub.name} ${match.homeScore}:${match.awayScore} ${match.awayClub.name} (бодирани ${scored} прогнози)`);
  res.json(await populate(Match.findById(match._id)));
});

/** Admin – cascades to the match's predictions and comments. */
const remove = asyncHandler(async (req, res) => {
  const match = await Match.findByIdAndDelete(req.params.id);
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  const [{ deletedCount: predictions }, { deletedCount: comments }] = await Promise.all([
    Prediction.deleteMany({ match: match._id }),
    Comment.deleteMany({ match: match._id }),
  ]);
  logActivity(req.user, 'delete', 'Match', match._id, `Избришан натпревар (${match.competition}) со ${predictions} прогнози и ${comments} коментари`);
  res.status(204).end();
});

/** GET /api/matches/:id/dependencies – for the delete confirmation popup */
const dependencies = asyncHandler(async (req, res) => {
  const [predictions, comments] = await Promise.all([
    Prediction.countDocuments({ match: req.params.id }),
    Comment.countDocuments({ match: req.params.id }),
  ]);
  res.json({ predictions, comments });
});

module.exports = { list, competitions, getOne, create, update, setResult, remove, dependencies, scorePredictions };
