const Comment = require('../models/comment');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const { HttpError, asyncHandler } = require('../utils/http');
const { canModify } = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { sendMail, templates } = require('../services/mailer');

const listForMatch = asyncHandler(async (req, res) => {
  if (!(await Match.exists({ _id: req.params.matchId }))) throw new HttpError(404, 'Натпреварот не постои');
  const comments = await Comment.find({ match: req.params.matchId })
    .sort({ createdAt: 1 })
    .populate('author', 'username fullName role');
  res.json(comments);
});

const create = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.matchId).populate('homeClub awayClub', 'name');
  if (!match) throw new HttpError(404, 'Натпреварот не постои');
  const comment = await Comment.create({ match: match._id, author: req.user._id, text: req.body.text });

  // interaction between users: everybody who predicted this match is notified (not the author)
  const preds = await Prediction.find({ match: match._id, user: { $ne: req.user._id } })
    .populate('user', 'email emailNotifications');
  preds.filter((p) => p.user?.emailNotifications)
    .forEach((p) => sendMail({ to: p.user.email, ...templates.newComment(match, comment, req.user) }));

  logActivity(req.user, 'create', 'Comment', comment._id, `Коментар на ${match.homeClub?.name} – ${match.awayClub?.name}`);
  res.status(201).json(await comment.populate('author', 'username fullName role'));
});

const update = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Коментарот не постои');
  if (String(comment.author) !== String(req.user._id)) throw new HttpError(403, 'Може да ги уредувате само своите коментари');
  comment.text = req.body.text;
  await comment.save();
  logActivity(req.user, 'update', 'Comment', comment._id, 'Изменет коментар');
  res.json(await comment.populate('author', 'username fullName role'));
});

const remove = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new HttpError(404, 'Коментарот не постои');
  if (!canModify(req.user, comment.author)) throw new HttpError(403, 'Може да ги бришете само своите коментари');
  await comment.deleteOne();
  logActivity(req.user, 'delete', 'Comment', comment._id, 'Избришан коментар');
  res.status(204).end();
});

module.exports = { listForMatch, create, update, remove };
