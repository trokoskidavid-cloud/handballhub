const mongoose = require('mongoose');
const { MATCH_STATUSES } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Performance:
 *       type: object
 *       required: [player]
 *       properties:
 *         player: { type: string, description: Player ObjectId }
 *         club: { type: string, description: "Club the player played for (set by the server)" }
 *         goals: { type: integer, minimum: 0, maximum: 25, example: 6 }
 *         shots: { type: integer, minimum: 0, maximum: 40, example: 9, description: "Shots on goal (goals <= shots)" }
 *         assists: { type: integer, minimum: 0, maximum: 20, example: 3 }
 *         saves: { type: integer, minimum: 0, maximum: 40, example: 0, description: Goalkeeper saves }
 *         suspensions: { type: integer, minimum: 0, maximum: 3, example: 1, description: 2-minute suspensions }
 *     Match:
 *       type: object
 *       required: [homeClub, awayClub, date, competition]
 *       properties:
 *         _id: { type: string }
 *         homeClub: { type: string, description: Club ObjectId }
 *         awayClub: { type: string, description: Club ObjectId }
 *         date: { type: string, format: date-time }
 *         competition: { type: string, example: Super Liga }
 *         round: { type: integer, minimum: 1, maximum: 50, example: 4 }
 *         venue: { type: string, example: Jane Sandanski Arena }
 *         status: { type: string, enum: [scheduled, finished] }
 *         homeScore: { type: integer, nullable: true, example: 31 }
 *         awayScore: { type: integer, nullable: true, example: 28 }
 *         performances:
 *           type: array
 *           items: { $ref: '#/components/schemas/Performance' }
 *         predictionCount: { type: integer, description: computed }
 *         commentCount: { type: integer, description: computed }
 */
const int = (min, max) => ({
  type: Number,
  min,
  max,
  default: 0,
  validate: { validator: Number.isInteger, message: 'Мора да е цел број' },
});

const performanceSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    goals: int(0, 25),
    shots: int(0, 40),
    assists: int(0, 20),
    saves: int(0, 40),
    suspensions: int(0, 3),
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    homeClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Домаќинот е задолжителен'] },
    awayClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Гостинот е задолжителен'] },
    date: { type: Date, required: [true, 'Датумот е задолжителен'] },
    competition: { type: String, required: [true, 'Натпреварувањето е задолжително'], trim: true, maxlength: 60 },
    round: { type: Number, min: 1, max: 50 },
    venue: { type: String, trim: true, maxlength: 80 },
    status: { type: String, enum: MATCH_STATUSES, default: 'scheduled' },
    homeScore: { type: Number, min: 0, max: 70, default: null },
    awayScore: { type: Number, min: 0, max: 70, default: null },
    performances: [performanceSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

matchSchema.pre('validate', function rules(next) {
  if (this.homeClub && this.awayClub && this.homeClub.equals(this.awayClub)) {
    this.invalidate('awayClub', 'Домаќинот и гостинот мора да се различни клубови');
  }
  if (this.status === 'finished') {
    if (this.homeScore == null) this.invalidate('homeScore', 'Внесете резултат за одигран натпревар');
    if (this.awayScore == null) this.invalidate('awayScore', 'Внесете резултат за одигран натпревар');
  } else {
    // a scheduled match has no result and no statistics yet
    this.homeScore = null;
    this.awayScore = null;
    this.performances = [];
  }
  (this.performances || []).forEach((p, i) => {
    if (p.goals > p.shots) this.invalidate(`performances.${i}.goals`, 'Головите не може да се повеќе од шутовите');
  });
  next();
});

matchSchema.virtual('predictionCount', { ref: 'Prediction', localField: '_id', foreignField: 'match', count: true });
matchSchema.virtual('commentCount', { ref: 'Comment', localField: '_id', foreignField: 'match', count: true });

matchSchema.index({ date: -1 });
matchSchema.index({ status: 1, date: 1 });
matchSchema.index({ 'performances.player': 1 });

module.exports = mongoose.model('Match', matchSchema);
