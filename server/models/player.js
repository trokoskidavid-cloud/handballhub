const mongoose = require('mongoose');
const { PATTERNS, POSITIONS, HANDS } = require('../utils/patterns');

/**
 * @openapi
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       required: [firstName, lastName, dateOfBirth, nationality, position]
 *       properties:
 *         _id: { type: string }
 *         firstName: { type: string, example: Filip }
 *         lastName: { type: string, example: Stojanovski }
 *         dateOfBirth: { type: string, format: date, example: 2002-05-14 }
 *         nationality: { type: string, example: North Macedonia }
 *         position: { type: string, enum: [GK, LW, LB, CB, RB, RW, PV], description: "GK goalkeeper, LW/RW wings, LB/CB/RB backs, PV pivot" }
 *         jerseyNumber: { type: integer, minimum: 1, maximum: 99, example: 7 }
 *         hand: { type: string, enum: [left, right], description: Throwing hand }
 *         heightCm: { type: integer, minimum: 160, maximum: 220, example: 192 }
 *         club: { oneOf: [ { type: string }, { $ref: '#/components/schemas/Club' } ] }
 *         photoUrl: { type: string, format: uri }
 *         notes: { type: string }
 *         bio: { type: string, description: Biography imported from TheSportsDB }
 *         externalId: { type: string, description: TheSportsDB idPlayer }
 *         createdBy: { type: string }
 *         appearances: { type: integer, description: computed from finished matches }
 *         goals: { type: integer, description: computed from finished matches }
 *     PlayerInput:
 *       type: object
 *       required: [firstName, lastName, dateOfBirth, nationality, position]
 *       properties:
 *         firstName: { type: string, example: Filip }
 *         lastName: { type: string, example: Stojanovski }
 *         dateOfBirth: { type: string, format: date, example: 2002-05-14 }
 *         nationality: { type: string, example: North Macedonia }
 *         position: { type: string, example: LB }
 *         jerseyNumber: { type: integer, example: 7 }
 *         hand: { type: string, example: right }
 *         heightCm: { type: integer, example: 192 }
 *         club: { type: string, description: Club ObjectId }
 *         photoUrl: { type: string }
 *         notes: { type: string }
 */
const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Името е задолжително'],
      trim: true,
      match: [PATTERNS.personName, 'Невалидно име'],
    },
    lastName: {
      type: String,
      required: [true, 'Презимето е задолжително'],
      trim: true,
      match: [PATTERNS.personName, 'Невалидно презиме'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Датумот на раѓање е задолжителен'],
      validate: {
        validator(v) {
          const age = (Date.now() - v.getTime()) / (365.25 * 24 * 3600 * 1000);
          return age >= 15 && age <= 45;
        },
        message: 'Играчот мора да има помеѓу 15 и 45 години',
      },
    },
    nationality: {
      type: String,
      required: [true, 'Националноста е задолжителна'],
      trim: true,
      match: [PATTERNS.country, 'Невалидна националност'],
    },
    position: {
      type: String,
      required: [true, 'Позицијата е задолжителна'],
      enum: { values: POSITIONS, message: 'Непозната позиција: {VALUE}' },
    },
    jerseyNumber: {
      type: Number,
      min: [1, 'Бројот на дресот е од 1 до 99'],
      max: [99, 'Бројот на дресот е од 1 до 99'],
      validate: { validator: (v) => v == null || Number.isInteger(v), message: 'Бројот на дресот мора да е цел број' },
    },
    hand: { type: String, enum: HANDS, default: 'right' },
    heightCm: { type: Number, min: [160, 'Висина мин. 160 cm'], max: [220, 'Висина макс. 220 cm'] },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    photoUrl: { type: String, trim: true, match: [PATTERNS.url, 'Невалиден URL'] },
    notes: { type: String, maxlength: 1000 },
    bio: { type: String, maxlength: 5000 },
    externalId: { type: String, index: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

playerSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

playerSchema.index({ lastName: 1, firstName: 1 });
playerSchema.index({ club: 1 });

module.exports = mongoose.model('Player', playerSchema);
