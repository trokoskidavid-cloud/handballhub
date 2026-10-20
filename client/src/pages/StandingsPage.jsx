import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, EmptyState, ClubLogo, FormDots } from '../components/common';
import { BarChart, COLORS } from '../components/Charts';
import { signed } from '../pipes';

/** League table – computed by the server from the finished matches. */
export default function StandingsPage() {
  const [params, setParams] = useSearchParams();
  const competition = params.get('competition') || 'Super Liga';
  const competitions = useAsync(() => api.getCompetitions(), []);
  const { data, loading, error, reload } = useAsync(() => api.getStandings(competition), [competition]);
  const [exportError, setExportError] = useState(null);

  const exportCsv = async () => {
    setExportError(null);
    try { await api.downloadStandingsCsv(competition); } catch (err) { setExportError(err); }
  };

  return (
    <>
      <PageHeader title="Табела" icon="bi-list-ol" subtitle="Победа = 2 поени, нерешено = 1 поен. Се пресметува автоматски од одиграните натпревари.">
        <select className="form-select w-auto" value={competition} onChange={(e) => setParams({ competition: e.target.value })} aria-label="Натпреварување">
          {(competitions.data?.length ? competitions.data : [competition]).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" className="btn btn-outline-success d-print-none" onClick={exportCsv}><i className="bi bi-filetype-csv me-1" />CSV</button>
        <button type="button" className="btn btn-outline-secondary d-print-none" onClick={() => window.print()}><i className="bi bi-printer me-1" />Печати</button>
      </PageHeader>
      <ErrorAlert error={exportError} />
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.length === 0 ? <EmptyState icon="bi-list-ol" text="Нема одиграни натпревари во ова натпреварување." /> : (
        <>
          <div className="table-responsive mb-4">
            <table className="table bg-white align-middle shadow-sm table-standings">
              <thead className="table-light">
                <tr>
                  <th>#</th><th>Клуб</th><th title="одиграни">Н</th><th title="победи">П</th><th title="нерешени">Н</th><th title="порази">И</th>
                  <th className="d-none d-sm-table-cell" title="дадени:примени голови">Голови</th><th title="гол-разлика">+/-</th><th>Поени</th><th className="d-none d-md-table-cell">Форма</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.club._id} className={r.position === 1 ? 'table-warning' : ''}>
                    <td className="fw-bold">{r.position}.</td>
                    <td><span className="d-inline-flex align-items-center gap-2"><ClubLogo club={r.club} size={28} /><Link to={`/clubs/${r.club._id}`}>{r.club.name}</Link></span></td>
                    <td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td>
                    <td className="d-none d-sm-table-cell">{r.goalsFor}:{r.goalsAgainst}</td>
                    <td>{signed(r.goalDiff)}</td>
                    <td><span className="badge text-bg-dark fs-6">{r.points}</span></td>
                    <td className="d-none d-md-table-cell"><FormDots form={r.form} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small text-muted">Н – натпревари, П – победи, Н – нерешени, И – изгубени. Форма: последните 5 натпревари.</p>
          </div>
          <div className="card d-print-none">
            <div className="card-header">Дадени и примени голови</div>
            <div className="card-body">
              <BarChart labels={data.map((r) => r.club.name)} height={280}
                datasets={[{ label: 'Дадени', data: data.map((r) => r.goalsFor), backgroundColor: COLORS.orange }, { label: 'Примени', data: data.map((r) => r.goalsAgainst), backgroundColor: COLORS.navy }]} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
