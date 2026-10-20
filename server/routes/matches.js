const router = require('express').Router();
const ctrl = require('../controllers/matches');
const comments = require('../controllers/comments');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Matches
 *     description: Fixtures, results and per-player statistics
 *   - name: Comments
 *     description: Discussion of a match between users
 */

/**
 * @openapi
 * /matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches
 *     description: Scheduled matches are sorted soonest first, finished ones newest first.
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [scheduled, finished] } }
 *       - { in: query, name: competition, schema: { type: string, example: Super Liga } }
 *       - { in: query, name: round, schema: { type: integer } }
 *       - { in: query, name: club, schema: { type: string }, description: Only matches of this club }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200: { description: Paginated matches }
 *   post:
 *     tags: [Matches]
 *     summary: Create a match (admin)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } }
 *     responses:
 *       201: { description: Created }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, authorize('admin'), validate(rules.match), ctrl.create);

/**
 * @openapi
 * /matches/competitions:
 *   get:
 *     tags: [Matches]
 *     summary: Names of all competitions
 *     responses:
 *       200: { description: Array of strings }
 */
router.get('/competitions', ctrl.competitions);

/**
 * @openapi
 * /matches/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Match details with a summary of the predictions
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Match, content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Matches]
 *     summary: Update a match (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Match' } } }
 *     responses:
 *       200: { description: Updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Matches]
 *     summary: Delete a match with its predictions and comments (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, authorize('admin'), validateId(), validate(rules.match, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

/**
 * @openapi
 * /matches/{id}/result:
 *   put:
 *     tags: [Matches]
 *     summary: Enter the final result and player statistics (admin)
 *     description: The match becomes `finished` and every prediction gets its points (0–5). Predictors are notified by e-mail.
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [homeScore, awayScore]
 *             properties:
 *               homeScore: { type: integer, example: 31 }
 *               awayScore: { type: integer, example: 28 }
 *               performances: { type: array, items: { $ref: '#/components/schemas/Performance' } }
 *     responses:
 *       200: { description: Finished match }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 * /matches/{id}/dependencies:
 *   get:
 *     tags: [Matches]
 *     summary: Number of predictions and comments removed by a delete
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Counts }
 */
router.put('/:id/result', authenticate, authorize('admin'), validateId(), validate(rules.result), ctrl.setResult);
router.get('/:id/dependencies', validateId(), ctrl.dependencies);

/**
 * @openapi
 * /matches/{matchId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: Comments of a match
 *     parameters: [ { in: path, name: matchId, required: true, schema: { type: string } } ]
 *     responses:
 *       200: { description: Comments, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Comment' } } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment (logged-in user; users who predicted the match are notified)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: matchId, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, required: [text], properties: { text: { type: string, example: 'What a game!' } } } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Comment' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/:matchId/comments', validateId('matchId'), comments.listForMatch);
router.post('/:matchId/comments', authenticate, validateId('matchId'), validate(rules.comment), comments.create);

module.exports = router;
