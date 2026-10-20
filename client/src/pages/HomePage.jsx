import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Loader, ErrorAlert, EmptyState, ClubLogo, StatCard } from '../components/common';
import { MatchCard } from '../components/Cards';
import { formatDate } from '../pipes';
import { jerseyUri } from '../utils/graphics';

/** Live countdown to kick-off */
function Countdown({ date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, new Date(date).getTime() - now);
  const parts = [
    [Math.floor(left / 864e5), 'дена'],
    [Math.floor((left % 864e5) / 36e5), 'часа'],
    [Math.floor((left % 36e5) / 6e4), 'мин.'],
    [Math.floor((left % 6e4) / 1e3), 'сек.'],
  ];
  return (
    <div className="countdown" aria-label="Време до почеток">
      {parts.map(([v, l]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><small>{l}</small></div>)}
    </div>
  );
}

/** Next match in the spotlight with a countdown and a call to predict. */
function Spotlight({ match }) {
  if (!match) return <div className="spotlight d-flex align-items-center justify-content-center"><EmptyState icon="bi-calendar-x" text="Нема закажани натпревари." /></div>;
  return (
    <div className="spotlight text-center d-flex flex-column justify-content-between">
      <div>
        <div className="eyebrow mb-2"><span className="live-dot me-1" />Следен натпревар</div>
        <div className="small text-muted">{match.competition}{match.round !== '' && ` · ${match.round}. коло`}</div>
      </div>
      <div className="d-flex align-items-center justify-content-around my-3">
        <div className="text-center" style={{ width: '40%' }}>
          <ClubLogo club={match.homeClub} size={64} />
          <div className="fw-bold mt-2 small text-uppercase">{match.homeClub?.name}</div>
        </div>
        <div className="big-number text-muted">VS</div>
        <div className="text-center" style={{ width: '40%' }}>
          <ClubLogo club={match.awayClub} size={64} />
          <div className="fw-bold mt-2 small text-uppercase">{match.awayClub?.name}</div>
        </div>
      </div>
      <div>
        <Countdown date={match.date} />
        <div className="small text-muted mt-2">{formatDate(match.date, 'match')}{match.venue && ` · ${match.venue}`}</div>
        <Link to={`/matches/${match._id}`} className="btn btn-primary w-100 mt-3"><i className="bi bi-bullseye me-1" />Внеси прогноза</Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const overview = useAsync(() => api.getOverview(), []);
  const upcoming = useAsync(() => api.getMatches({ status: 'scheduled', limit: 8 }), []);
  const results = useAsync(() => api.getMatches({ status: 'finished', limit: 6 }), []);
  const table = useAsync(() => api.getStandings('Super Liga'), []);
  const c = overview.data?.counts || {};
  const scorers = overview.data?.topScorers || [];
  const next = upcoming.data?.items?.[0];

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-xl-8">
          <section className="hero h-100">
            <div className="hero-body">
              <div className="eyebrow mb-2">{isLoggedIn ? `Здраво, ${user.username}` : 'Ракометен matchday'}</div>
              <h1>Погоди го резултатот.<br /><span>Освои поени.</span></h1>
              <p className="text-muted mt-3 mb-4">
                Супер лига и EHF Лига на шампиони на едно место: семафор во живо, табела, статистика за секој играч
                и игра со прогнози каде точниот резултат носи 5 поени.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/matches?status=scheduled" className="btn btn-primary btn-lg"><i className="bi bi-lightning-charge-fill me-1" />Прогнозирај</Link>
                {isLoggedIn
                  ? <Link to="/my-predictions" className="btn btn-ghost btn-lg">Мои поени</Link>
                  : <Link to="/register" className="btn btn-ghost btn-lg">Креирај профил</Link>}
              </div>
            </div>
          </section>
        </div>
        <div className="col-xl-4">
          {upcoming.loading ? <div className="spotlight"><Loader /></div> : <Spotlight match={next} />}
        </div>
      </div>

      <ErrorAlert error={overview.error} onRetry={overview.reload} />
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard value={c.played} label="Одиграни" icon="bi-check2-all" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.scheduled} label="Закажани" icon="bi-calendar2-week" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.predictions} label="Прогнози" icon="bi-bullseye" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.players} label="Играчи" icon="bi-person-badge" /></div>
      </div>

      <section className="mb-4">
        <div className="d-flex justify-content-between align-items-end mb-2">
          <div><div className="eyebrow">Распоред</div><h2 className="h3 text-uppercase mb-0">Следно коло</h2></div>
          <Link to="/matches?status=scheduled" className="small">Целиот распоред <i className="bi bi-arrow-right" /></Link>
        </div>
        {upcoming.loading ? <Loader /> : upcoming.error ? <ErrorAlert error={upcoming.error} onRetry={upcoming.reload} /> : upcoming.data.items.length === 0
          ? <EmptyState icon="bi-calendar-x" text="Нема закажани натпревари." />
          : <div className="h-scroll">{upcoming.data.items.map((m) => <div key={m._id}><MatchCard match={m} /></div>)}</div>}
      </section>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="d-flex justify-content-between align-items-end mb-2">
            <div><div className="eyebrow">Семафор</div><h2 className="h3 text-uppercase mb-0">Последни резултати</h2></div>
            <Link to="/matches?status=finished" className="small">Сите <i className="bi bi-arrow-right" /></Link>
          </div>
          {results.loading ? <Loader /> : results.error ? <ErrorAlert error={results.error} /> : results.data.items.length === 0
            ? <EmptyState text="Сè уште нема одиграни натпревари." />
            : <div className="row g-3">{results.data.items.map((m) => <div className="col-md-6" key={m._id}><MatchCard match={m} /></div>)}</div>}
        </div>

        <div className="col-lg-5">
          <div className="panel p-3 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="eyebrow">Супер лига · табела</div>
              <Link to="/standings" className="small">Цела <i className="bi bi-arrow-right" /></Link>
            </div>
            {table.loading ? <Loader /> : table.error ? <ErrorAlert error={table.error} /> : (
              <table className="table table-sm standings">
                <tbody>
                  {table.data.slice(0, 6).map((r, i) => (
                    <tr key={r.club._id} className={i === 0 ? 'lead' : ''}>
                      <td className="pos-num ps-2">{r.position}</td>
                      <td><span className="d-inline-flex align-items-center gap-2"><ClubLogo club={r.club} size={24} /><Link to={`/clubs/${r.club._id}`} className="text-reset">{r.club.name}</Link></span></td>
                      <td className="text-muted small">{r.played} нат.</td>
                      <td className="pts-big text-end pe-2">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel p-3">
            <div className="eyebrow mb-3">Топ стрелци</div>
            {overview.loading ? <Loader /> : scorers.length === 0 ? <EmptyState icon="bi-bullseye" text="Нема податоци." /> : (
              <>
                <div className="podium mb-3">
                  {[scorers[1], scorers[0], scorers[2]].map((s, i) => s && (
                    <Link key={s._id} to={`/players/${s._id}`} className={`podium-step text-reset${i === 1 ? ' first' : ''}`}>
                      <img src={jerseyUri('', s.club, s.name.split(' ').slice(-1)[0])} alt="" width={i === 1 ? 74 : 58} className="rounded-3 mb-1" />
                      <div className="podium-rank">{s.goals}</div>
                      <div className="small fw-semibold text-truncate">{s.name}</div>
                      <div className="text-muted" style={{ fontSize: '.7rem' }}>{i === 1 ? '1.' : i === 0 ? '2.' : '3.'} место</div>
                    </Link>
                  ))}
                </div>
                <ol className="list-unstyled mb-0 small" start={4}>
                  {scorers.slice(3, 6).map((s, i) => (
                    <li key={s._id} className="d-flex justify-content-between py-1 border-top border-secondary-subtle">
                      <span><span className="text-muted me-2">{i + 4}.</span><Link to={`/players/${s._id}`} className="text-reset">{s.name}</Link> <span className="text-muted">· {s.club}</span></span>
                      <strong className="text-lime">{s.goals}</strong>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="panel p-4 mt-4">
        <div className="row g-4 align-items-center">
          <div className="col-md-4">
            <div className="eyebrow">Правила</div>
            <h2 className="h3 text-uppercase mb-0">Како се освојуваат поени?</h2>
          </div>
          {[['+2', 'Точен победник', 'или погодено нерешено'], ['+1', 'Гол-разлика', 'точна разлика во голови'], ['+2', 'Точен резултат', 'вкупно 5 поени']].map(([n, t, d]) => (
            <div className="col-4 col-md-2 col-lg" key={t}>
              <div className="big-number text-lime">{n}</div>
              <div className="fw-semibold small">{t}</div>
              <div className="text-muted" style={{ fontSize: '.75rem' }}>{d}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
