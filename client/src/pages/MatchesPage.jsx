import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Match } from '../models';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { MatchCard } from '../components/Cards';
import { FormModal } from '../components/Modals';
import FormField from '../components/FormField';
import { validate, matchSchema } from '../utils/validators';
import { formatDate } from '../pipes';

const TABS = [['', 'Сите'], ['scheduled', 'Закажани'], ['finished', 'Одиграни']];

/** Admin popup: new match or edit of date / venue / competition (the result is entered on the match page). */
export function MatchFormModal({ match, onHide, onSaved }) {
  const clubs = useAsync(() => api.getClubs(), []);
  const competitions = useAsync(() => api.getCompetitions(), []);
  const [m, setM] = useState(() => ({
    homeClub: match?.homeClubId || '',
    awayClub: match?.awayClubId || '',
    date: match?.date ? formatDate(match.date, 'datetime-local') : `${formatDate(new Date(Date.now() + 7 * 864e5), 'iso')}T19:00`,
    competition: match?.competition || 'Super Liga',
    round: match?.round ?? '',
    venue: match?.venue || '',
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const editing = !!match?._id;

  const set = (k, v) => {
    setM((x) => {
      const next = { ...x, [k]: v };
      // default venue = arena of the home club
      if (k === 'homeClub' && !x.venue) next.venue = clubs.data?.find((c) => c._id === v)?.arena || '';
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const errs = validate(m, matchSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const payload = new Match({ ...m, homeClub: m.homeClub, awayClub: m.awayClub, date: new Date(m.date) }).toPayload();
      onSaved(await api.saveMatch(match?._id, payload));
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };

  const clubOptions = [['', '– избери –'], ...(clubs.data || []).map((c) => [c._id, c.name])];
  return (
    <FormModal show title={editing ? 'Уреди натпревар' : 'Нов натпревар'} onHide={onHide} onSubmit={submit} busy={busy}>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <FormField className="col-md-6" label="Домаќин" name="homeClub" type="select" value={m.homeClub} onChange={set} error={errors.homeClub} options={clubOptions} required disabled={editing} />
      <FormField className="col-md-6" label="Гостин" name="awayClub" type="select" value={m.awayClub} onChange={set} error={errors.awayClub} options={clubOptions} required disabled={editing} />
      <FormField className="col-md-6" label="Датум и време" name="date" type="datetime-local" value={m.date} onChange={set} error={errors.date} required />
      <FormField className="col-md-6" label="Натпреварување" name="competition" value={m.competition} onChange={set} error={errors.competition} list="competitions" required />
      <datalist id="competitions">{(competitions.data || []).map((c) => <option key={c} value={c} />)}</datalist>
      <FormField className="col-md-4" label="Коло" name="round" type="number" min="1" max="50" value={m.round} onChange={set} error={errors.round} />
      <FormField className="col-md-8" label="Сала" name="venue" value={m.venue} onChange={set} error={errors.venue} help="Автоматски: салата на домаќинот" />
    </FormModal>
  );
}

export default function MatchesPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;
  const competitions = useAsync(() => api.getCompetitions(), []);
  const { data, loading, error, reload } = useAsync(() => api.getMatches({ limit: 12, ...query }), [params.toString()]);
  const [adding, setAdding] = useState(false);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <>
      <PageHeader title="Натпревари" icon="bi-calendar-event" subtitle="Распоред, резултати и прогнози">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><i className="bi bi-plus-lg me-1" />Нов натпревар</button>}
      </PageHeader>

      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <ul className="nav nav-pills">
          {TABS.map(([value, label]) => (
            <li className="nav-item" key={label}>
              <button type="button" className={`nav-link${(query.status || '') === value ? ' active' : ''}`} onClick={() => update({ status: value })}>{label}</button>
            </li>
          ))}
        </ul>
        <select className="form-select w-auto" value={query.competition || ''} onChange={(e) => update({ competition: e.target.value })} aria-label="Натпреварување">
          <option value="">Сите натпреварувања</option>
          {(competitions.data || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {query.status === 'scheduled' && (
        <div className="alert alert-info small py-2"><i className="bi bi-lightbulb me-1" />Отвори натпревар и внеси прогноза пред почетокот. Точен резултат носи 5 поени!</div>
      )}

      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.items.length === 0 ? <EmptyState text="Нема натпревари за избраните филтри." /> : (
        <>
          <div className="row g-3 mb-3">
            {data.items.map((m) => <div className="col-md-6 col-xl-4" key={m._id}><MatchCard match={m} /></div>)}
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => update({ page: String(n) })} />
        </>
      )}
      {adding && <MatchFormModal onHide={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); competitions.reload(); }} />}
    </>
  );
}
