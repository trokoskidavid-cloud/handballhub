const User = require('../models/user');
const Prediction = require('../models/prediction');
const Comment = require('../models/comment');
const { HttpError, asyncHandler } = require('../utils/http');
const { logActivity } = require('../services/activity');

const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const counts = await Prediction.aggregate([{ $group: { _id: '$user', n: { $sum: 1 }, points: { $sum: { $ifNull: ['$points', 0] } } } }]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(users.map((u) => ({
    ...u.toJSON(),
    predictionCount: byUser[String(u._id)]?.n || 0,
    points: byUser[String(u._id)]?.points || 0,
  })));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  res.json(user);
});

/** Admin: any field incl. role. User: only own fullName/country/emailNotifications. */
const update = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && req.user._id !== req.params.id) throw new HttpError(403, 'Може да го менувате само својот профил');
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');

  const allowed = ['fullName', 'country', 'emailNotifications', ...(isAdmin ? ['role'] : [])];
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) user[k] = req.body[k];
  });
  if (isAdmin && req.body.role && req.user._id === req.params.id && req.body.role !== 'admin') {
    throw new HttpError(400, 'Администраторот не може сам да си ја одземе улогата');
  }
  await user.save();
  logActivity(req.user, 'update', 'User', user._id, `Ажуриран корисник ${user.username}`);
  res.json(user);
});

const remove = asyncHandler(async (req, res) => {
  if (req.user._id === req.params.id) throw new HttpError(400, 'Не може да се избришете самите себе');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  // cascade: the user's predictions and comments
  await Promise.all([Prediction.deleteMany({ user: user._id }), Comment.deleteMany({ author: user._id })]);
  logActivity(req.user, 'delete', 'User', user._id, `Избришан корисник ${user.username}`);
  res.status(204).end();
});

module.exports = { list, getOne, update, remove };
