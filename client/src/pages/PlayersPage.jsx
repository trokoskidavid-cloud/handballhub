import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { PlayerCard } from '../components/Cards';
import { positionName } from '../pipes';
import { POSITIONS } from '../utils/validators';

/**
 * Printout of the list of players. All filters live in the URL (?q=&position=&club=&sort=&page=)
 * so browser back / forward restores the previous view.
 */
export default function PlayersPage() {
  const { isLoggedIn } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;

  const clubs = useAsync(() => api.getClubs(), []);
  const { data, loading, error, reload } = useAsync(() => api.getPlayers({ limit: 12, sort: 'name', ...query }), [params.toString()]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const filtered = ['q', 'position', 'club'].some((k) => query[k]);

  return (
    <>
      <PageHeader eyebrow="Ростер" title="Играчи" subtitle={data ? (filtered ? `Пронајдени ${data.total} играчи` : `${data.total} играчи во базата`) : ' '}>
        {isLoggedIn && (
          <>
            <Link to="/external" className="btn btn-ghost"><i className="bi bi-cloud-arrow-down me-1" />Увези</Link>
            <Link to="/players/new" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Нов играч</Link>
          </>
        )}
      </PageHeader>

      <div className="panel p-3 mb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className={`chip${!query.position ? ' chip-lime' : ''}`} onClick={() => update('position', '')}>Сите</button>
          {POSITIONS.map((p) => (
            <button type="button" key={p} className={`chip${query.position === p ? ' chip-lime' : ''}`} onClick={() => update('position', query.position === p ? '' : p)} title={positionName(p)}>
              {p} · {positionName(p)}
            </button>
          ))}
        </div>
        <div className="row g-2">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-transparent"><i className="bi bi-search" /></span>
              <input key={query.q || ''} className="form-control" placeholder="Име, клуб, град или националност + Enter" defaultValue={query.q || ''}
                onKeyDown={(e) => e.key === 'Enter' && update('q', e.target.value.trim())}
                onBlur={(e) => e.target.value.trim() !== (query.q || '') && update('q', e.target.value.trim())} aria-label="Филтер" />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <select className="form-select" value={query.club || ''} onChange={(e) => update('club', e.target.value)} aria-label="Клуб">
              <option value="">Сите клубови</option>
              {(clubs.data || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select" value={query.sort || 'name'} onChange={(e) => update('sort', e.target.value)} aria-label="Подредување">
              <option value="name">Подреди: име</option>
              <option value="goals">Подреди: голови</option>
              <option value="age">Подреди: најмлади</option>
              <option value="height">Подреди: највисоки</option>
              <option value="newest">Подреди: најнови</option>
            </select>
          </div>
        </div>
      </div>

      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.items.length === 0 ? (
        <EmptyState icon="bi-person-x" text="Нема играчи што одговараат на филтрите." />
      ) : data && (
        <>
          <div className="row g-3">
            {data.items.map((p) => <div className="col-6 col-md-4 col-xl-3" key={p._id}><PlayerCard player={p} /></div>)}
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => update('page', String(n))} />
        </>
      )}
    </>
  );
}
