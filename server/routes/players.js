const router = require('express').Router();
const ctrl = require('../controllers/players');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId, rules } = require('../middleware/validate');

/**
 * @openapi
 * tags:
 *   - name: Players
 *     description: Handball players (season statistics are computed from the matches)
 */

/**
 * @openapi
 * /players:
 *   get:
 *     tags: [Players]
 *     summary: List / search players
 *     description: Filtering, sorting and pagination. `appearances`, `goals`, `shots` and `saves` are computed from the finished matches.
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: "Name, club, city or nationality keyword (Cyrillic works too)" }
 *       - { in: query, name: position, schema: { type: string }, description: "Comma separated, e.g. LB,CB" }
 *       - { in: query, name: hand, schema: { type: string, enum: [left, right] } }
 *       - { in: query, name: nationality, schema: { type: string } }
 *       - { in: query, name: club, schema: { type: string } }
 *       - { in: query, name: minAge, schema: { type: integer } }
 *       - { in: query, name: maxAge, schema: { type: integer } }
 *       - { in: query, name: minHeight, schema: { type: integer } }
 *       - { in: query, name: minGoals, schema: { type: integer } }
 *       - { in: query, name: sort, schema: { type: string, enum: [name, goals, age, height, newest] } }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200:
 *         description: Paginated players
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Player' } }
 *   post:
 *     tags: [Players]
 *     summary: Add a player (logged-in user)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/PlayerInput' } } }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', ctrl.list);
router.post('/', authenticate, validate(rules.player), ctrl.create);

/**
 * @openapi
 * /players/{id}:
 *   get:
 *     tags: [Players]
 *     summary: Player details
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Player, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     tags: [Players]
 *     summary: Update a player (admin or the user who added it)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     requestBody:
 *       content: { application/json: { schema: { $ref: '#/components/schemas/PlayerInput' } } }
 *     responses:
 *       200: { description: Updated, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Players]
 *     summary: Delete a player and remove its match statistics (admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       204: { description: Deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', validateId(), ctrl.getOne);
router.put('/:id', authenticate, validateId(), validate(rules.player, { partial: true }), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), validateId(), ctrl.remove);

/**
 * @openapi
 * /players/{id}/stats:
 *   get:
 *     tags: [Players]
 *     summary: Season statistics of a player (finished matches)
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appearances: { type: integer }
 *                 goals: { type: integer }
 *                 shots: { type: integer }
 *                 assists: { type: integer }
 *                 saves: { type: integer }
 *                 suspensions: { type: integer }
 *                 shootingPct: { type: integer, nullable: true }
 *                 goalsPerMatch: { type: number, nullable: true }
 *                 timeline: { type: array, items: { type: object } }
 * /players/{id}/dependencies:
 *   get:
 *     tags: [Players]
 *     summary: Number of matches that hold statistics of the player
 *     parameters: [ { $ref: '#/components/parameters/id' } ]
 *     responses:
 *       200: { description: Counts }
 */
router.get('/:id/stats', validateId(), ctrl.stats);
router.get('/:id/dependencies', validateId(), ctrl.dependencies);

module.exports = router;
