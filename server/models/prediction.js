const mongoose = require('mongoose');

/**
 * @openapi
 * components:
 *   schemas:
 *     Prediction:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         user: { oneOf: [ { type: string }, { $ref: '#/components/schemas/User' } ] }
 *         match: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Match' } ] }
 *         homeScore: { type: integer, example: 30 }
 *         awayScore: { type: integer, example: 27 }
 *         note: { type: string, example: Vardar is stronger at home }
 *         points: { type: integer, nullable: true, description: "null until the match is finished; 0-5" }
 *         createdAt: { type: string, format: date-time }
 *     PredictionInput:
 *       type: object
 *       required: [match, homeScore, awayScore]
 *       properties:
 *         match: { type: string, description: Match ObjectId (must be scheduled) }
 *         homeScore: { type: integer, minimum: 0, maximum: 70, example: 30 }
 *         awayScore: { type: integer, minimum: 0, maximum: 70, example: 27 }
 *         note: { type: string, maxLength: 200 }
 */
const score = {
  type: Number,
  required: [true, 'Внесете број на голови'],
  min: [0, 'Резултатот е од 0 до 70'],
  max: [70, 'Резултатот е од 0 до 70'],
  validate: { validator: Number.isInteger, message: 'Резултатот мора да е цел број' },
};

const predictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: [true, 'Натпреварот е задолжителен'] },
    homeScore: score,
    awayScore: score,
    note: { type: String, trim: true, maxlength: [200, 'Белешката може да има најмногу 200 знаци'] },
    points: { type: Number, min: 0, max: 5, default: null },
  },
  { timestamps: true }
);

// one prediction per user per match
predictionSchema.index({ user: 1, match: 1 }, { unique: true });
predictionSchema.index({ match: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
