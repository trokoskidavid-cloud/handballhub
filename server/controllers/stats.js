const Player = require('../models/player');
const Club = require('../models/club');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const User = require('../models/user');
const { asyncHandler } = require('../utils/http');
const { leaderboardData } = require('./predictions');

const finished = { $match: { status: 'finished' } };
const withPlayer = [
  { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'p' } },
  { $unwind: '$p' },
  { $lookup: { from: 'clubs', localField: 'p.club', foreignField: '_id', as: 'c' } },
];

/** GET /api/stats/overview – data for the home page and the charts dashboard */
const overview = asyncHandler(async (_req, res) => {
  const [players, clubs, played, scheduled, predictions, users,
    topScorers, topGoalkeepers, goalsByPosition, results, goalsPerRound, pointsSplit, leaderboard] = await Promise.all([
    Player.countDocuments(),
    Club.countDocuments(),
    Match.countDocuments({ status: 'finished' }),
    Match.countDocuments({ status: 'scheduled' }),
    Prediction.countDocuments(),
    User.countDocuments(),
    Match.aggregate([
      finished,
      { $unwind: '$performances' },
      { $group: { _id: '$performances.player', goals: { $sum: '$performances.goals' }, shots: { $sum: '$performances.shots' }, appearances: { $sum: 1 } } },
      { $match: { goals: { $gt: 0 } } },
      { $sort: { goals: -1, appearances: 1 } },
      { $limit: 10 },
      ...withPlayer,
      { $project: { goals: 1, shots: 1, appearances: 1, name: { $concat: ['$p.firstName', ' ', '$p.lastName'] }, club: { $first: '$c.name' } } },
    ]),
    Match.aggregate([
      finished,
      { $unwind: '$performances' },
      { $group: { _id: '$performances.player', saves: { $sum: '$performances.saves' }, appearances: { $sum: 1 } } },
      { $match: { saves: { $gt: 0 } } },
      { $sort: { saves: -1 } },
      { $limit: 5 },
      ...withPlayer,
      { $project: { saves: 1, appearances: 1, name: { $concat: ['$p.firstName', ' ', '$p.lastName'] }, club: { $first: '$c.name' } } },
    ]),
    Match.aggregate([
      finished,
      { $unwind: '$performances' },
      { $lookup: { from: 'players', localField: 'performances.player', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { _id: '$p.position', goals: { $sum: '$performances.goals' } } },
      { $sort: { goals: -1 } },
    ]),
    Match.aggregate([
      finished,
      {
        $group: {
          _id: { $cond: [{ $gt: ['$homeScore', '$awayScore'] }, 'home', { $cond: [{ $lt: ['$homeScore', '$awayScore'] }, 'away', 'draw'] }] },
          count: { $sum: 1 },
        },
      },
    ]),
    Match.aggregate([
      finished,
      { $match: { round: { $ne: null } } },
      { $group: { _id: '$round', avgGoals: { $avg: { $add: ['$homeScore', '$awayScore'] } }, matches: { $sum: 1 } } },
      { $project: { avgGoals: { $round: ['$avgGoals', 1] }, matches: 1 } },
      { $sort: { _id: 1 } },
    ]),
    Prediction.aggregate([
      { $match: { points: { $ne: null } } },
      { $group: { _id: '$points', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
    leaderboardData(),
  ]);

  res.json({
    counts: { players, clubs, played, scheduled, predictions, users },
    topScorers,
    topGoalkeepers,
    goalsByPosition,
    results,
    goalsPerRound,
    pointsSplit,
    topPredictors: leaderboard.slice(0, 8),
  });
});

module.exports = { overview };
