import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination, PointsBadge, StatCard } from '../components/common';
import { BarChart, DoughnutChart, COLORS } from '../components/Charts';
import { ConfirmModal } from '../components/Modals';
import { formatDate, pointsLabel } from '../pipes';

/** Ranking of the users by prediction points + CSV report. */
export function LeaderboardPage() {
  const { user, isLoggedIn } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.getLeaderboard(), []);
  const [exportError, setExportError] = useState(null);

  const exportCsv = async () => {
    setExportError(null);
    try { await api.downloadLeaderboardCsv(); } catch (err) { setExportError(err); }
  };

  return (
    <>
      <PageHeader eyebrow="Игра со прогнози" title="Ранг-листа" subtitle="Точен победник 2 поени · + точна гол-разлика 1 · + точен резултат 2 (најмногу 5)">
        <button type="button" className="btn btn-ghost" onClick={exportCsv}><i className="bi bi-filetype-csv me-1" />Извези CSV</button>
        {isLoggedIn && <Link to="/my-predictions" className="btn btn-primary"><i className="bi bi-person me-1" />Мои прогнози</Link>}
        <Link to="/matches?status=scheduled" className="btn btn-coral"><i className="bi bi-plus-lg me-1" />Нова прогноза</Link>
      </PageHeader>
      <ErrorAlert error={exportError} />
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.length === 0 ? <EmptyState icon="bi-trophy" text="Сè уште нема прогнози." /> : (
        <div className="row g-4">
          <div className="col-12">
            <div className="podium" style={{ maxWidth: 640, margin: '0 auto' }}>
              {[data[1], data[0], data[2]].map((r, i) => r && (
                <div key={r._id} className={`podium-step${i === 1 ? ' first' : ''}`}>
                  <span className="avatar mb-2" style={i === 1 ? { width: 54, height: 54, fontSize: '1rem' } : undefined}>{r.username.slice(0, 2).toUpperCase()}</span>
                  <div className="podium-rank">{r.points}</div>
                  <div className="fw-semibold text-truncate">{r.username}</div>
                  <div className="text-muted small">{['🥈 2. место', '🥇 1. место', '🥉 3. место'][i]}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-lg-7">
            <div className="panel table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr><th>#</th><th>Навивач</th><th>Поени</th><th title="бодирани / вкупно прогнози">Прогнози</th><th title="точен резултат">Точни</th><th title="точен победник">Успешност</th></tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r._id} className={user && r._id === user._id ? 'table-warning' : ''}>
                      <td className="fw-bold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}.`}</td>
                      <td>{r.username}<br /><small className="text-muted">{r.fullName}</small></td>
                      <td className="pts-big">{r.points}</td>
                      <td>{r.scored} / {r.predictions}</td>
                      <td>{r.exact}</td>
                      <td>{r.accuracy != null ? `${r.accuracy}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card">
              <div className="card-header">Поени по навивач</div>
              <div className="card-body">
                <BarChart labels={data.slice(0, 10).map((r) => r.username)} values={data.slice(0, 10).map((r) => r.points)} label="Поени" color={COLORS.lime} horizontal height={Math.max(180, data.slice(0, 10).length * 36)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** The logged-in user's predictions: open ones and scored ones. */
export function MyPredictionsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const scored = params.get('scored') || '';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useAsync(() => api.getPredictions({ mine: 'true', scored, page, limit: 15 }), [scored, page]);
  const board = useAsync(() => api.getLeaderboard(), []);
  const [toDelete, setToDelete] = useState(null);
  const me = board.data?.find((r) => r._id === user._id);
  const split = [5, 3, 2, 0].map((p) => (data?.items || []).filter((x) => x.points === p).length);

  const tab = (value, label) => (
    <li className="nav-item" key={label}>
      <button type="button" className={`nav-link${scored === value ? ' active' : ''}`} onClick={() => setParams(value ? { scored: value } : {})}>{label}</button>
    </li>
  );

  return (
    <>
      <PageHeader eyebrow="Мојот профил" title="Мои прогнози" breadcrumbs={[['Ранг-листа', '/leaderboard'], ['Мои прогнози']]}>
        <Link to="/matches?status=scheduled" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Нова прогноза</Link>
      </PageHeader>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><StatCard value={me ? `${me.rank}.` : '–'} label="Место на ранг-листа" icon="bi-trophy" /></div>
        <div className="col-6 col-md-3"><StatCard value={me?.points ?? 0} label="Вкупно поени" icon="bi-star" /></div>
        <div className="col-6 col-md-3"><StatCard value={me?.exact ?? 0} label="Точни резултати" icon="bi-bullseye" /></div>
        <div className="col-6 col-md-3"><StatCard value={me?.accuracy != null ? `${me.accuracy}%` : '–'} label="Погоден победник" icon="bi-check2-circle" /></div>
      </div>
      <ul className="nav nav-pills mb-3">{tab('', 'Сите')}{tab('false', 'Отворени')}{tab('true', 'Бодирани')}</ul>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.items.length === 0 ? (
        <EmptyState icon="bi-graph-up-arrow" text="Немаш прогнози во оваа листа.">
          <Link to="/matches?status=scheduled" className="btn btn-primary">Прогнозирај натпревар</Link>
        </EmptyState>
      ) : (
        <div className="row g-4">
          <div className={scored === 'false' ? 'col-12' : 'col-lg-8'}>
            <div className="list-group mb-3">
              {data.items.map((p) => (
                <div key={p._id} className="list-group-item d-flex flex-wrap align-items-center gap-2">
                  <span className="me-auto">
                    <Link to={`/matches/${p.matchId}`} className="fw-semibold">{p.match ? `${p.match.homeClub?.name} – ${p.match.awayClub?.name}` : 'Натпревар'}</Link>
                    <br />
                    <small className="text-muted">
                      {p.match && formatDate(p.match.date)} · прогноза <strong>{p.scoreline}</strong>
                      {p.match?.isFinished && <> · резултат <strong>{p.match.score}</strong></>}
                    </small>
                  </span>
                  <span className="text-end">
                    <PointsBadge points={p.points} /><br /><small className="text-muted">{pointsLabel(p.points)}</small>
                  </span>
                  {p.match?.isOpen && (
                    <span>
                      <Link to={`/matches/${p.matchId}`} className="btn btn-sm btn-outline-primary me-1" title="Измени"><i className="bi bi-pencil" /></Link>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(p)} aria-label="Избриши"><i className="bi bi-trash" /></button>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Pagination page={page} pages={data.pages} onChange={(n) => setParams({ ...(scored ? { scored } : {}), page: String(n) })} />
          </div>
          {scored !== 'false' && (
            <div className="col-lg-4">
              <div className="card">
                <div className="card-header">Поени на оваа страница</div>
                <div className="card-body">
                  {split.some(Boolean)
                    ? <DoughnutChart labels={['5 (точен резултат)', '3', '2', '0']} values={split} colors={[COLORS.lime, COLORS.blue, COLORS.violet, COLORS.coral]} height={240} />
                    : <EmptyState icon="bi-pie-chart" text="Нема бодирани прогнози." />}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmModal show={!!toDelete} title="Избриши прогноза" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deletePrediction(toDelete._id); setToDelete(null); reload(); board.reload(); }}>
        Дали сакате да ја избришете прогнозата <strong>{toDelete?.scoreline}</strong>?
      </ConfirmModal>
    </>
  );
}
