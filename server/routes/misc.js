const router = require('express').Router();
const activities = require('../controllers/activities');
const stats = require('../controllers/stats');
const external = require('../controllers/external');
const db = require('../controllers/db');
const { asyncHandler } = require('../utils/http');
const { computeStandings } = require('../services/standings');
const { authenticate } = require('../middleware/auth');

/**
 * @openapi
 * tags:
 *   - name: Standings
 *     description: League table computed from the finished matches
 *   - name: Activities
 *     description: History of user activities
 *   - name: Statistics
 *     description: Aggregated data for charts
 *   - name: External (TheSportsDB)
 *     description: Integration with the external source TheSportsDB
 *   - name: Database
 *     description: Test helpers used by the /db page
 */

/**
 * @openapi
 * /standings:
 *   get:
 *     tags: [Standings]
 *     summary: League table (win 2 points, draw 1)
 *     parameters:
 *       - { in: query, name: competition, schema: { type: string, example: Super Liga } }
 *     responses:
 *       200: { description: "Rows: position, club, played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points, form" }
 * /standings.csv:
 *   get:
 *     tags: [Standings]
 *     summary: Download the league table as a CSV report
 *     parameters:
 *       - { in: query, name: competition, schema: { type: string, example: Super Liga } }
 *     responses:
 *       200: { description: CSV file, content: { text/csv: { schema: { type: string } } } }
 */
const competitionOf = (req) => (req.query.competition ? String(req.query.competition) : undefined);
router.get('/standings', asyncHandler(async (req, res) => res.json(await computeStandings(competitionOf(req)))));
router.get('/standings.csv', asyncHandler(async (req, res) => {
  const rows = await computeStandings(competitionOf(req));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Место', 'Клуб', 'Одиграни', 'Победи', 'Нерешени', 'Порази', 'Дадени', 'Примени', 'Гол-разлика', 'Поени'];
  const lines = rows.map((r) => [r.position, r.club.name, r.played, r.won, r.drawn, r.lost, r.goalsFor, r.goalsAgainst, r.goalDiff, r.points].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="handballhub-tabela-${Date.now()}.csv"`);
  res.send(`\uFEFF${header.map(esc).join(',')}\n${lines.join('\n')}`);
}));

/**
 * @openapi
 * /activities:
 *   get:
 *     tags: [Activities]
 *     summary: Activity history (own for users, all for admin)
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: action, schema: { type: string, enum: [create, update, delete, login, register, import, result] } }
 *       - { in: query, name: entityType, schema: { type: string } }
 *       - { in: query, name: user, schema: { type: string }, description: admin only }
 *       - { $ref: '#/components/parameters/page' }
 *       - { $ref: '#/components/parameters/limit' }
 *     responses:
 *       200:
 *         description: Paginated activities
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Activity' } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/activities', authenticate, activities.list);

/**
 * @openapi
 * /stats/overview:
 *   get:
 *     tags: [Statistics]
 *     summary: Counts and aggregations for the dashboard charts
 *     responses:
 *       200: { description: Statistics }
 */
router.get('/stats/overview', stats.overview);

/**
 * @openapi
 * /external/players:
 *   get:
 *     tags: [External (TheSportsDB)]
 *     summary: Search players in TheSportsDB
 *     parameters:
 *       - { in: query, name: name, required: true, schema: { type: string, example: Dika Mem } }
 *     responses:
 *       200: { description: Normalized player list; importedId is set for already imported players }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       502: { description: External service unavailable }
 * /external/teams:
 *   get:
 *     tags: [External (TheSportsDB)]
 *     summary: Search teams in TheSportsDB
 *     parameters:
 *       - { in: query, name: name, required: true, schema: { type: string, example: Vardar } }
 *     responses:
 *       200: { description: Normalized team list }
 *       502: { description: External service unavailable }
 * /external/import:
 *   post:
 *     tags: [External (TheSportsDB)]
 *     summary: Import a TheSportsDB handball player (and club) into HandballHub
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [externalId]
 *             properties:
 *               externalId: { type: string, example: '34161993' }
 *               position: { type: string, description: Override the mapped position }
 *               dateOfBirth: { type: string, format: date, description: Required if TheSportsDB has none }
 *               jerseyNumber: { type: integer, example: 7 }
 *     responses:
 *       201: { description: Imported player, content: { application/json: { schema: { $ref: '#/components/schemas/Player' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { description: Already imported }
 *       502: { description: External service unavailable }
 */
router.get('/external/players', external.searchPlayers);
router.get('/external/teams', external.searchTeams);
router.post('/external/import', authenticate, external.importPlayer);

/**
 * @openapi
 * /db:
 *   get:
 *     tags: [Database]
 *     summary: Number of documents per collection
 *     responses:
 *       200: { description: Counts }
 *   delete:
 *     tags: [Database]
 *     summary: Delete ALL data from the database
 *     responses:
 *       200: { description: Deleted counts }
 * /db/seed:
 *   post:
 *     tags: [Database]
 *     summary: Reset and insert the initial data (users, clubs, players, matches, predictions, comments)
 *     responses:
 *       201: { description: Inserted counts }
 */
router.get('/db', db.status);
router.delete('/db', db.clear);
router.post('/db/seed', db.seed);

module.exports = router;
