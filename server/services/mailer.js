const nodemailer = require('nodemailer');

/**
 * E-mail notifications (nodemailer).
 * If SMTP_HOST is configured, real SMTP is used (e.g. Gmail app password, Mailtrap, Brevo…).
 * Otherwise a JSON transport is used and the message is only logged – handy for local dev.
 */
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || 'HandballHub <no-reply@handballhub.mk>',
      to,
      subject,
      html,
    });
    if (!process.env.SMTP_HOST) console.log(`[mail] (dev, not sent) to=${to} subject="${subject}"`);
    return info;
  } catch (err) {
    // e-mail must never break the main request
    console.error('[mail] failed:', err.message);
    return null;
  }
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

const templates = {
  welcome: (user) => ({
    subject: 'Добредојде во HandballHub 🤾',
    html: `<h2>Здраво ${esc(user.fullName || user.username)}!</h2>
      <p>Твојот профил <b>${esc(user.username)}</b> е успешно креиран.</p>
      <p>Прогнозирај ги следните натпревари и собирај поени: <a href="${appUrl()}/matches?status=scheduled">${appUrl()}/matches</a></p>`,
  }),
  predictionScored: (user, prediction, match) => ({
    subject: `Освои ${prediction.points} поени: ${match.homeClub?.name} ${match.homeScore}:${match.awayScore} ${match.awayClub?.name}`,
    html: `<p>Здраво ${esc(user.username)},</p>
      <p>Натпреварот <b>${esc(match.homeClub?.name)} ${match.homeScore}:${match.awayScore} ${esc(match.awayClub?.name)}</b> заврши.</p>
      <p>Твојата прогноза беше <b>${prediction.homeScore}:${prediction.awayScore}</b> и освои <b>${prediction.points}</b> поени.</p>
      <p><a href="${appUrl()}/leaderboard">Погледни ја ранг-листата</a></p>`,
  }),
  newComment: (match, comment, author) => ({
    subject: `Нов коментар: ${match.homeClub?.name || ''} – ${match.awayClub?.name || ''}`,
    html: `<p><b>${esc(author.username)}</b> коментираше на натпреварот што го прогнозираше:</p>
      <blockquote>${esc(comment.text)}</blockquote>
      <p><a href="${appUrl()}/matches/${match._id}">Отвори го натпреварот</a></p>`,
  }),
};

module.exports = { sendMail, templates };
