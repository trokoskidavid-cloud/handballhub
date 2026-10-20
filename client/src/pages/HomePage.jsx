import { Link } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { StatCard, Loader, ErrorAlert, EmptyState, ClubLogo } from '../components/common';
import { MatchCard } from '../components/Cards';

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const overview = useAsync(() => api.getOverview(), []);
  const upcoming = useAsync(() => api.getMatches({ status: 'scheduled', limit: 4 }), []);
  const results = useAsync(() => api.getMatches({ status: 'finished', limit: 4 }), []);
  const table = useAsync(() => api.getStandings('Super Liga'), []);
  const c = overview.data?.counts || {};

  const matchList = (state, empty) => (state.loading ? <Loader /> : state.error ? <ErrorAlert error={state.error} onRetry={state.reload} /> : state.data.items.length === 0 ? (
    <EmptyState text={empty} />
  ) : (
    <div className="row g-3">
      {state.data.items.map((m) => <div className="col-md-6" key={m._id}><MatchCard match={m} /></div>)}
    </div>
  ));

  return (
    <>
      <div className="p-4 p-md-5 mb-4 rounded-4 hero text-white">
        <h1 className="display-6 fw-bold">{isLoggedIn ? `Добредојде, ${user.username}!` : 'Ракомет, резултати и прогнози на едно место'}</h1>
        <p className="lead col-lg-8">
          HandballHub ги следи натпреварите од ракометната Супер лига и Лигата на шампиони: резултати, табела,
          статистика на играчите и игра со прогнози каде навивачите собираат поени.
        </p>
        <Link to="/matches?status=scheduled" className="btn btn-orange btn-lg me-2 mb-2">Прогнозирај натпревари</Link>
        {isLoggedIn
          ? <Link to="/leaderboard" className="btn btn-outline-light btn-lg mb-2">Ранг-листа</Link>
          : <Link to="/register" className="btn btn-outline-light btn-lg mb-2">Регистрирај се</Link>}
      </div>

      <ErrorAlert error={overview.error} onRetry={overview.reload} />
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><StatCard value={c.played} label="Одиграни натпревари" icon="bi-check2-circle" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.scheduled} label="Закажани натпревари" icon="bi-calendar-event" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.players} label="Играчи" icon="bi-people" /></div>
        <div className="col-6 col-md-3"><StatCard value={c.predictions} label="Прогнози" icon="bi-graph-up-arrow" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h4 mb-0">Следни натпревари</h2>
            <Link to="/matches?status=scheduled">Сите →</Link>
          </div>
          {matchList(upcoming, 'Нема закажани натпревари.')}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-4">
            <h2 className="h4 mb-0">Последни резултати</h2>
            <Link to="/matches?status=finished">Сите →</Link>
          </div>
          {matchList(results, 'Сè уште нема одиграни натпревари.')}
        </div>

        <div className="col-lg-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h4 mb-0">Супер лига</h2>
            <Link to="/standings">Табела →</Link>
          </div>
          {table.loading ? <Loader /> : table.error ? <ErrorAlert error={table.error} /> : (
            <ul className="list-group mb-4">
              {table.data.slice(0, 6).map((r) => (
                <li key={r.club._id} className="list-group-item d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ width: 18 }}>{r.position}.</span>
                  <ClubLogo club={r.club} size={24} />
                  <Link to={`/clubs/${r.club._id}`} className="me-auto text-decoration-none text-truncate">{r.club.name}</Link>
                  <span className="badge text-bg-dark" title="поени">{r.points}</span>
                </li>
              ))}
              {table.data.length === 0 && <li className="list-group-item text-muted">Нема податоци</li>}
            </ul>
          )}

          <h2 className="h4">Топ стрелци</h2>
          {overview.loading ? <Loader /> : (
            <ol className="list-group list-group-numbered">
              {(overview.data?.topScorers || []).slice(0, 5).map((s) => (
                <li key={s._id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span className="ms-2 me-auto">
                    <Link to={`/players/${s._id}`} className="text-decoration-none">{s.name}</Link>
                    <br /><small className="text-muted">{s.club}</small>
                  </span>
                  <span className="badge rounded-pill" style={{ background: '#f77f00' }} title="голови">{s.goals}</span>
                </li>
              ))}
              {!overview.data?.topScorers?.length && <li className="list-group-item text-muted">Нема податоци</li>}
            </ol>
          )}

          <div className="card mt-4">
            <div className="card-body small">
              <h3 className="h6"><i className="bi bi-info-circle me-1" />Како се добиваат поени?</h3>
              <ul className="mb-2 ps-3">
                <li>Точен победник (или нерешено) – <strong>2 поени</strong></li>
                <li>+ точна гол-разлика – <strong>1 поен</strong></li>
                <li>+ точен резултат – <strong>2 поени</strong> (вкупно 5)</li>
              </ul>
              <h3 className="h6"><i className="bi bi-people me-1" />Кој што може?</h3>
              <ul className="mb-0 ps-3">
                <li><strong>Гостин</strong> – резултати, табела, играчи, статистика.</li>
                <li><strong>Навивач</strong> – прогнози, коментари, додава играчи, увоз од TheSportsDB.</li>
                <li><strong>Администратор</strong> – натпревари и резултати, клубови, корисници.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
