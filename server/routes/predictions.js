const router = require('express').Router();
const ctrl = require('../controllers/predictions');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Predictions
 *     description: "Prediction game: correct winner 2 points, + correct goal difference 1, + exact result 2 (max 5)"
 */

/**
 * @openapi
 * /predictions:
 *   get:
 *     tags: [Predictions]
 *     summary: List predictions
 *     parameters:
 *       - { in: query, name: match, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string } }
 *       - { in: query, name: mine, schema: { type: boolean }, description: Only own predictions (needs JWT) }
 *       - { in: query, name: scored, schema: { type: boolean }, description: Only scored / only open predictions }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, points] } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200:
 *         description: Paginated predictions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Prediction' } }
 *   post:
 *     tags: [Predictions]
 *     summary: Predict the result of a scheduled match (one per user and match)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/PredictionInput' } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Prediction' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409: { description: Already predicted this match }
 */
router.get('/', optionalAuth, ctrl.list);
router.post('/', authenticate, validate(rules.prediction), ctrl.create);

/**
 * @openapi
 * /predictions/leaderboard:
 *   get:
 *     tags: [Predictions]
 *     summary: Ranking of users by prediction points
 *     responses:
 *       200: { description: Leaderboard rows }
 * /predictions/leaderboard.csv:
 *   get:
 *     tags: [Predictions]
 *     summary: Download the leaderboard as a CSV report
 *     responses:
 *       200: { description: CSV file, content: { text/csv: { schema: { type: string } } } }
 */
router.get('/leaderboard', ctrl.leaderboard);
router.get('/leaderboard.csv', ctrl.leaderboardCsv);

/**
 * @openapi
 * /predictions/{id}:
 *   get:
 *     tags: [Predictions]
 *     summary: One prediction
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Prediction, content: { application/json: { schema: { $ref: '#/components/schemas/Prediction' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Predictions]
 *     summary: Change own prediction (only before the match)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { homeScore: { type: integer }, awayScore: { type: integer }, note: { type: string } } } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Predictions]
 *     summary: Delete a prediction (owner before the match, admin always)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, validateId(), validate({ ...rules.prediction, match: {} }, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, validateId(), ctrl.remove);

module.exports = router;
