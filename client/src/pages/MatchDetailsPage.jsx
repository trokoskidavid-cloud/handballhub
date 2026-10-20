import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Prediction } from '../models';
import { PageHeader, Loader, ErrorAlert, EmptyState, ClubLogo, MatchStatusBadge, PointsBadge, Avatar } from '../components/common';
import { ConfirmModal, FormModal } from '../components/Modals';
import { DoughnutChart, COLORS } from '../components/Charts';
import CommentSection from '../components/CommentSection';
import FormField from '../components/FormField';
import { MatchFormModal } from './MatchesPage';
import { validate, predictionSchema, resultSchema } from '../utils/validators';
import { formatDate, timeAgo, pointsLabel, percent } from '../pipes';

/** Number input with − / + buttons (used for goals). */
function ScoreInput({ label, value, onChange, error, id }) {
  const n = Number(value) || 0;
  return (
    <div className="text-center">
      <label className="form-label small d-block text-truncate" htmlFor={id}>{label}</label>
      <div className="input-group input-group-lg justify-content-center flex-nowrap">
        <button type="button" className="btn btn-outline-secondary" onClick={() => onChange(String(Math.max(0, n - 1)))} aria-label="помалку">−</button>
        <input id={id} type="number" min="0" max="70" className={`form-control text-center fw-bold${error ? ' is-invalid' : ''}`} style={{ maxWidth: 80 }}
          value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn btn-outline-secondary" onClick={() => onChange(String(Math.min(70, n + 1)))} aria-label="повеќе">+</button>
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

/** The logged-in user's prediction for this match (create / change / delete). */
function MyPrediction({ match, onChanged }) {
  const { isLoggedIn } = useAuth();
  const mine = useAsync(() => (isLoggedIn ? api.getPredictions({ match: match._id, mine: 'true' }).then((p) => p.items[0] || null) : Promise.resolve(null)), [match._id, isLoggedIn]);
  const [form, setForm] = useState(null); // Prediction being edited
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isLoggedIn) {
    return <p className="mb-0"><Link to="/login" state={{ from: `/matches/${match._id}` }}>Најави се</Link> за да внесеш прогноза и да собираш поени.</p>;
  }
  if (mine.loading) return <Loader />;
  if (mine.error) return <ErrorAlert error={mine.error} onRetry={mine.reload} />;
  const p = mine.data;

  const start = () => { setForm(p ? Object.assign(new Prediction(), p) : new Prediction({ match: match._id, homeScore: '', awayScore: '' })); setErrors({}); setMsg(null); };
  const change = (k, v) => { setForm((f) => Object.assign(new Prediction(), f, { [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(form, predictionSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const saved = await api.savePrediction(form);
      mine.setData(saved);
      setForm(null);
      setMsg(p ? 'Прогнозата е изменета.' : 'Прогнозата е зачувана. Среќно!');
      onChanged();
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await api.deletePrediction(p._id);
    mine.setData(null);
    setConfirm(false);
    setMsg('Прогнозата е избришана.');
    onChanged();
  };

  if (form) {
    return (
      <form onSubmit={save} noValidate>
        {errors._ && <div className="alert alert-danger py-2">{errors._}</div>}
        <div className="d-flex justify-content-center align-items-end gap-3 flex-wrap mb-3">
          <ScoreInput id="pred-home" label={match.homeClub?.name} value={form.homeScore} error={errors.homeScore} onChange={(v) => change('homeScore', v)} />
          <span className="fs-3 fw-bold pb-2">:</span>
          <ScoreInput id="pred-away" label={match.awayClub?.name} value={form.awayScore} error={errors.awayScore} onChange={(v) => change('awayScore', v)} />
        </div>
        <FormField label="Белешка (не е задолжително)" name="note" value={form.note} onChange={change} error={errors.note} maxLength={200} placeholder="пр. Домаќинот е во одлична форма" help={`${form.note.length}/200`} />
        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-orange" disabled={busy}>{busy && <span className="spinner-border spinner-border-sm me-2" />}Зачувај прогноза</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setForm(null)}>Откажи</button>
        </div>
      </form>
    );
  }

  return (
    <>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {p ? (
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div>
            <div className="small text-muted">Твојата прогноза</div>
            <div className="score-sm fs-3">{p.scoreline}</div>
            {p.note && <div className="small fst-italic">„{p.note}“</div>}
          </div>
          <div className="ms-auto text-end">
            {match.isFinished && <><PointsBadge points={p.points} size="fs-5" /><div className="small text-muted">{pointsLabel(p.points)}</div></>}
            {match.isOpen && (
              <>
                <button type="button" className="btn btn-outline-primary btn-sm me-1" onClick={start}><i className="bi bi-pencil me-1" />Измени</button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirm(true)}><i className="bi bi-trash" /></button>
              </>
            )}
          </div>
        </div>
      ) : match.isOpen ? (
        <button type="button" className="btn btn-orange btn-lg w-100" onClick={start}><i className="bi bi-graph-up-arrow me-2" />Внеси прогноза</button>
      ) : (
        <p className="text-muted mb-0">{match.isFinished ? 'Немаше прогноза за овој натпревар.' : 'Натпреварот започна – прогнозите се затворени.'}</p>
      )}
      <ConfirmModal show={confirm} title="Избриши прогноза" confirmText="Избриши" onCancel={() => setConfirm(false)} onConfirm={remove}>
        Дали сакате да ја избришете прогнозата <strong>{p?.scoreline}</strong>?
      </ConfirmModal>
    </>
  );
}

/** Admin popup: final score + statistics of the players of both clubs. */
function ResultModal({ match, onHide, onSaved }) {
  const squads = useAsync(() => Promise.all([api.getClub(match.homeClubId), api.getClub(match.awayClubId)]), [match._id]);
  const [score, setScore] = useState({ homeScore: match.homeScore ?? '', awayScore: match.awayScore ?? '' });
  const [perf, setPerf] = useState(() => Object.fromEntries(match.performances.filter((p) => p.player).map((p) => [p.player._id, { ...p, player: p.player._id }])));
  // players who played in this match but have since moved to another club stay in the list
  const extra = (clubId) => match.performances.filter((p) => p.player && String(p.club) === String(clubId) && p.player.clubId !== clubId).map((p) => p.player);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const toggle = (pid) => setPerf((x) => {
    const next = { ...x };
    if (next[pid]) delete next[pid];
    else next[pid] = { player: pid, goals: 0, shots: 0, assists: 0, saves: 0, suspensions: 0 };
    return next;
  });
  const setStat = (pid, k, v) => setPerf((x) => ({ ...x, [pid]: { ...x[pid], [k]: v } }));

  const submit = async () => {
    const errs = validate(score, resultSchema);
    const LIMITS = { goals: 25, shots: 40, assists: 20, saves: 40, suspensions: 3 };
    Object.values(perf).forEach((p) => {
      if (Object.entries(LIMITS).some(([k, max]) => !/^\d+$/.test(String(p[k])) || Number(p[k]) > max)) {
        errs.performances = 'Голови 0–25, шутови 0–40, асистенции 0–20, одбрани 0–40, исклучувања 0–3';
      } else if (Number(p.goals) > Number(p.shots)) {
        errs.performances = 'Головите не може да се повеќе од шутовите';
      }
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const performances = Object.values(perf).map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, k === 'player' ? v : Number(v)])));
      onSaved(await api.saveResult(match._id, { homeScore: Number(score.homeScore), awayScore: Number(score.awayScore), performances }));
    } catch (err) {
      setErrors({ _: err.message });
    } finally {
      setBusy(false);
    }
  };

  const table = (club) => (
    <div className="col-12" key={club._id}>
      <h3 className="h6 mt-2">{club.name}</h3>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead><tr><th /><th>Играч</th><th>Гол.</th><th>Шут.</th><th>Ас.</th><th>Одбр.</th><th>2'</th></tr></thead>
          <tbody>
            {[...club.players, ...extra(club._id)].map((pl) => {
              const p = perf[pl._id];
              return (
                <tr key={pl._id}>
                  <td><input type="checkbox" className="form-check-input" checked={!!p} onChange={() => toggle(pl._id)} aria-label={`Настапи ${pl.fullName}`} /></td>
                  <td className="text-nowrap">{pl.fullName} <small className="text-muted">{pl.position}</small></td>
                  {['goals', 'shots', 'assists', 'saves', 'suspensions'].map((k) => (
                    <td key={k} style={{ minWidth: 64 }}>
                      <input type="number" min="0" className="form-control form-control-sm" disabled={!p} value={p?.[k] ?? ''}
                        onChange={(e) => setStat(pl._id, k, e.target.value)} aria-label={`${k} ${pl.fullName}`} />
                    </td>
                  ))}
                </tr>
              );
            })}
            {club.players.length === 0 && <tr><td colSpan={7} className="text-muted">Клубот нема играчи во базата.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <FormModal show size="lg" title="Внеси резултат" onHide={onHide} onSubmit={submit} busy={busy} submitText="Зачувај резултат">
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <div className="col-12 d-flex justify-content-center align-items-end gap-3 flex-wrap">
        <ScoreInput id="res-home" label={match.homeClub?.name} value={score.homeScore} error={errors.homeScore} onChange={(v) => setScore((s) => ({ ...s, homeScore: v }))} />
        <span className="fs-3 fw-bold pb-2">:</span>
        <ScoreInput id="res-away" label={match.awayClub?.name} value={score.awayScore} error={errors.awayScore} onChange={(v) => setScore((s) => ({ ...s, awayScore: v }))} />
      </div>
      <p className="col-12 small text-muted mb-0">По зачувување, натпреварот станува „одигран“ и сите прогнози автоматски добиваат поени.</p>
      {errors.performances && <div className="col-12"><div className="alert alert-warning py-1 mb-0">{errors.performances}</div></div>}
      {squads.loading ? <div className="col-12"><Loader /></div> : squads.error ? <div className="col-12"><ErrorAlert error={squads.error} /></div> : squads.data.map(table)}
    </FormModal>
  );
}

function StatsTable({ title, rows }) {
  return (
    <div className="card h-100">
      <div className="card-header">{title}</div>
      <div className="table-responsive">
        <table className="table table-sm mb-0 align-middle">
          <thead><tr><th>Играч</th><th>Гол.</th><th>Шут.</th><th title="успешност">%</th><th>Ас.</th><th>Одбр.</th><th>2'</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.player._id}>
                <td><Link to={`/players/${p.player._id}`}>{p.player.fullName}</Link> <small className="text-muted">{p.player.position}</small></td>
                <td className="fw-bold">{p.goals}</td><td>{p.shots}</td><td>{percent(p.goals, p.shots)}</td><td>{p.assists}</td><td>{p.saves}</td><td>{p.suspensions}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="text-muted">Нема внесена статистика.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const match = useAsync(() => api.getMatch(id), [id]);
  const predictions = useAsync(() => api.getPredictions({ match: id, limit: 100, sort: 'points' }), [id]);
  const [modal, setModal] = useState(null); // 'result' | 'edit'
  const [confirm, setConfirm] = useState(null);

  // on reload (after a prediction / result) keep showing the page instead of a blank loader
  if (match.loading && match.data?._id !== id) return <Loader />;
  if (match.error) return <ErrorAlert error={match.error} onRetry={match.reload} />;
  if (!match.data) return <Loader />;
  const m = match.data;
  const sum = m.predictionSummary;
  const refresh = () => { match.reload(); predictions.reload(); };

  const openDelete = async () => setConfirm(await api.getMatchDependencies(id).catch(() => ({ predictions: '?', comments: '?' })));

  return (
    <>
      <PageHeader title={`${m.homeClub?.name} – ${m.awayClub?.name}`} breadcrumbs={[['Натпревари', '/matches'], [`${m.homeClub?.name} – ${m.awayClub?.name}`]]}>
        {isAdmin && (
          <>
            <button type="button" className="btn btn-orange" onClick={() => setModal('result')}><i className="bi bi-clipboard-check me-1" />{m.isFinished ? 'Измени резултат' : 'Внеси резултат'}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setModal('edit')}><i className="bi bi-pencil me-1" />Уреди</button>
            <button type="button" className="btn btn-outline-danger" onClick={openDelete}><i className="bi bi-trash me-1" />Избриши</button>
          </>
        )}
      </PageHeader>

      <div className="card shadow-sm mb-4">
        <div className="card-body text-center">
          <div className="small text-muted mb-2">
            {m.competition}{m.round !== '' && ` · ${m.round}. коло`} · {formatDate(m.date, 'long')}{m.venue && ` · ${m.venue}`} <MatchStatusBadge status={m.status} />
          </div>
          <div className="row align-items-center">
            <div className="col-4">
              <ClubLogo club={m.homeClub} size={72} />
              <div className="mt-2 fw-semibold"><Link to={`/clubs/${m.homeClubId}`}>{m.homeClub?.name}</Link></div>
            </div>
            <div className="col-4">
              <div className="score">{m.isFinished ? m.score : formatDate(m.date, 'time')}</div>
              {!m.isFinished && <div className="small text-muted">{timeAgo(m.date)}</div>}
            </div>
            <div className="col-4">
              <ClubLogo club={m.awayClub} size={72} />
              <div className="mt-2 fw-semibold"><Link to={`/clubs/${m.awayClubId}`}>{m.awayClub?.name}</Link></div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card h-100 border-warning">
            <div className="card-header"><i className="bi bi-graph-up-arrow me-1" />Моја прогноза</div>
            <div className="card-body"><MyPrediction match={m} onChanged={refresh} /></div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">Што прогнозираат навивачите ({sum?.total || 0})</div>
            <div className="card-body">
              {sum?.total ? (
                <>
                  <DoughnutChart height={190} labels={[`Победа ${m.homeClub?.name}`, 'Нерешено', `Победа ${m.awayClub?.name}`]}
                    values={[sum.home, sum.draw, sum.away]} colors={[COLORS.navy, COLORS.gray, COLORS.orange]} />
                  <p className="text-center small mt-2 mb-0">Просечна прогноза: <strong>{sum.avgHome} : {sum.avgAway}</strong></p>
                </>
              ) : <EmptyState icon="bi-pie-chart" text="Сè уште нема прогнози." />}
            </div>
          </div>
        </div>
      </div>

      {m.isFinished && (
        <div className="row g-4 mb-4">
          <div className="col-lg-6"><StatsTable title={m.homeClub?.name} rows={m.side('home')} /></div>
          <div className="col-lg-6"><StatsTable title={m.awayClub?.name} rows={m.side('away')} /></div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">Прогнози</div>
            <ul className="list-group list-group-flush">
              {predictions.loading ? <li className="list-group-item"><Loader /></li> : (predictions.data?.items || []).map((p) => (
                <li key={p._id} className="list-group-item d-flex align-items-center gap-2">
                  <Avatar name={p.user?.username || '?'} />
                  <span className="me-auto">
                    <strong>{p.user?.username || 'избришан корисник'}</strong>
                    {p.note && <><br /><small className="text-muted fst-italic">{p.note}</small></>}
                  </span>
                  <span className="score-sm">{p.scoreline}</span>
                  {m.isFinished && <PointsBadge points={p.points} />}
                </li>
              ))}
              {predictions.data?.items.length === 0 && <li className="list-group-item text-muted">Нема прогнози.</li>}
            </ul>
          </div>
        </div>
        <div className="col-lg-6"><CommentSection matchId={id} /></div>
      </div>

      {modal === 'result' && <ResultModal match={m} onHide={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'edit' && <MatchFormModal match={m} onHide={() => setModal(null)} onSaved={() => { setModal(null); match.reload(); }} />}
      <ConfirmModal show={!!confirm} title="Избриши натпревар" confirmText="Избриши" onCancel={() => setConfirm(null)}
        onConfirm={async () => { await api.deleteMatch(id); navigate('/matches', { replace: true }); }}>
        <p>Дали сте сигурни дека сакате да го избришете натпреварот <strong>{m.title}</strong>?</p>
        <div className="alert alert-warning small mb-0">
          Ќе бидат избришани и <strong>{confirm?.predictions} прогнози</strong> и <strong>{confirm?.comments} коментари</strong>. Акцијата не може да се врати.
        </div>
      </ConfirmModal>
    </>
  );
}
