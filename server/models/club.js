const mongoose = require('mongoose');
const { PATTERNS } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Club:
 *       type: object
 *       required: [name, city, country]
 *       properties:
 *         _id: { type: string }
 *         name: { type: string, example: RK Vardar 1961 }
 *         city: { type: string, example: Skopje }
 *         country: { type: string, example: North Macedonia }
 *         league: { type: string, example: Super Liga }
 *         founded: { type: integer, example: 1961 }
 *         arena: { type: string, example: Jane Sandanski Arena }
 *         logoUrl: { type: string, format: uri }
 *         externalId: { type: string, description: TheSportsDB idTeam }
 *         playerCount: { type: integer, description: computed }
 */
const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Името на клубот е задолжително'],
      unique: true,
      trim: true,
      match: [PATTERNS.clubName, 'Невалидно име на клуб'],
    },
    city: {
      type: String,
      required: [true, 'Градот е задолжителен'],
      trim: true,
      match: [PATTERNS.country, 'Невалиден град'],
    },
    country: {
      type: String,
      required: [true, 'Државата е задолжителна'],
      trim: true,
      match: [PATTERNS.country, 'Невалидна држава'],
    },
    league: { type: String, trim: true, maxlength: 60 },
    founded: {
      type: Number,
      min: [1900, 'Годината на основање мора да е по 1900'],
      max: [new Date().getFullYear(), 'Годината не може да е во иднина'],
    },
    arena: { type: String, trim: true, maxlength: 80 },
    logoUrl: { type: String, trim: true, match: [PATTERNS.url, 'Невалиден URL'] },
    externalId: { type: String, index: true, sparse: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

clubSchema.virtual('playerCount', {
  ref: 'Player',
  localField: '_id',
  foreignField: 'club',
  count: true,
});

module.exports = mongoose.model('Club', clubSchema);
