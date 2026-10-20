/** Data-driven cards reused on several pages (lists, search, home, club details...). */
import { Link } from 'react-router-dom';
import { ClubLogo } from './common';
import { formatDate, positionName, timeAgo, percent } from '../pipes';

/** Player "trading card": jersey/photo, position, name and season numbers. */
export function PlayerCard({ player, showClub = true }) {
  const p = player;
  return (
    <div className="pcard">
      <img src={p.photo} alt={p.fullName} className="pcard-img" loading="lazy" />
      <span className="pcard-pos chip chip-lime" title={positionName(p.position)}>{p.position}</span>
      <div className="pcard-body">
        <div className="pcard-name text-truncate">
          <Link to={`/players/${p._id}`} className="stretched-link">{p.firstName} <span className="text-lime">{p.lastName}</span></Link>
        </div>
        <div className="small text-muted text-truncate">
          {positionName(p.position)}{showClub && p.club && ` · ${p.club.name}`}{p.age != null && ` · ${p.age} год.`}
        </div>
        <div className="pcard-stats">
          <div><b>{p.appearances}</b><small>нат.</small></div>
          {p.isGoalkeeper
            ? <div><b>{p.saves}</b><small>одбрани</small></div>
            : <div><b>{p.goals}</b><small>голови</small></div>}
          <div><b>{p.isGoalkeeper ? (p.appearances ? Math.round(p.saves / p.appearances) : '–') : percent(p.goals, p.shots)}</b><small>{p.isGoalkeeper ? 'по нат.' : 'шут'}</small></div>
        </div>
      </div>
    </div>
  );
}

/** One match as a small scoreboard: two rows (home / away) with crests and goals. */
export function MatchCard({ match, children }) {
  const m = match;
  const row = (club, score, side) => (
    <div className={`sb-row${m.winner === side ? ' win' : ''}`}>
      <ClubLogo club={club} size={28} />
      <span className="name">{club?.name || '?'}</span>
      <span className="pts">{m.isFinished ? score : '–'}</span>
    </div>
  );
  return (
    <div className="scoreboard">
      <div className="meta">
        <span className="text-truncate">{m.competition}{m.round !== '' && ` · ${m.round}. коло`}</span>
        {m.isFinished ? <span>Крај</span> : <span className="text-lime"><span className="live-dot me-1" style={{ background: '#d4ff3f' }} />{timeAgo(m.date)}</span>}
      </div>
      {row(m.homeClub, m.homeScore, 'home')}
      {row(m.awayClub, m.awayScore, 'away')}
      <div className="foot">
        <span><i className="bi bi-calendar3 me-1" />{m.isFinished ? formatDate(m.date) : formatDate(m.date, 'match')}</span>
        <span>
          <i className="bi bi-bullseye me-1" title="прогнози" />{m.predictionCount}
          <i className="bi bi-chat-dots ms-2 me-1" title="коментари" />{m.commentCount}
        </span>
      </div>
      <Link to={`/matches/${m._id}`} className="stretched-link" aria-label={`${m.homeClub?.name} – ${m.awayClub?.name}`} />
      {children}
    </div>
  );
}
