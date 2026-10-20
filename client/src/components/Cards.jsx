/** Data-driven cards reused on several pages (lists, search, home, club details...). */
import { Link } from 'react-router-dom';
import { ClubLogo, MatchStatusBadge } from './common';
import { formatDate, positionName, timeAgo } from '../pipes';

export function PlayerCard({ player, showClub = true }) {
  return (
    <div className="card player-card h-100">
      <div className="card-body d-flex gap-3 align-items-center">
        <img src={player.photo} alt={player.fullName} className="player-thumb rounded" loading="lazy" />
        <div className="flex-grow-1 min-w-0">
          <Link to={`/players/${player._id}`} className="fw-bold stretched-link text-decoration-none">{player.fullName}</Link>
          <div className="small text-muted text-truncate">
            <span title={positionName(player.position)}>{positionName(player.position)}</span>
            {showClub && player.club && ` · ${player.club.name}`} · {player.age} год.
          </div>
          <div className="small">
            {player.isGoalkeeper
              ? <span title="одбрани удари"><i className="bi bi-shield-check text-primary" /> {player.saves} одбрани</span>
              : <span title="голови"><i className="bi bi-bullseye text-orange" /> {player.goals} голови</span>}
            <span className="text-muted"> · {player.appearances} нат.</span>
          </div>
        </div>
        {player.jerseyNumber !== '' && <span className="jersey" title="Број на дрес">{player.jerseyNumber}</span>}
      </div>
    </div>
  );
}

/** One match: clubs, result or kick-off time. */
export function MatchCard({ match, children }) {
  const m = match;
  const bold = (side) => (m.winner === side ? 'fw-bold' : '');
  return (
    <div className="card match-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between small text-muted mb-2">
          <span>{m.competition}{m.round !== '' && ` · ${m.round}. коло`}</span>
          <MatchStatusBadge status={m.status} />
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className={`flex-grow-1 text-end min-w-0 text-truncate ${bold('home')}`}>{m.homeClub?.name}</div>
          <ClubLogo club={m.homeClub} size={32} />
          <Link to={`/matches/${m._id}`} className="stretched-link text-decoration-none text-reset score-sm px-1">
            {m.isFinished ? m.score : formatDate(m.date, 'time')}
          </Link>
          <ClubLogo club={m.awayClub} size={32} />
          <div className={`flex-grow-1 min-w-0 text-truncate ${bold('away')}`}>{m.awayClub?.name}</div>
        </div>
        <div className="d-flex justify-content-between small text-muted mt-2">
          <span><i className="bi bi-calendar-event me-1" />{m.isFinished ? formatDate(m.date) : `${formatDate(m.date, 'match')} (${timeAgo(m.date)})`}</span>
          <span>
            <i className="bi bi-graph-up-arrow me-1" title="прогнози" />{m.predictionCount}
            <i className="bi bi-chat ms-2 me-1" title="коментари" />{m.commentCount}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
