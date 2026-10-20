import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, StatCard, EmptyState } from '../components/common';
import { ConfirmModal, ImageZoomModal } from '../components/Modals';
import { BarChart, DoughnutChart, COLORS } from '../components/Charts';
import { formatDate, positionName, handLabel, pipe, truncate } from '../pipes';

/** Detailed view of one player: profile, season statistics, charts and match log. */
export default function PlayerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canModify } = useAuth();
  const player = useAsync(() => api.getPlayer(id), [id]);
  const stats = useAsync(() => api.getPlayerStats(id), [id]);
  const [zoom, setZoom] = useState(false);
  const [confirm, setConfirm] = useState(null); // dependency counts when the delete modal is open
  const [showBio, setShowBio] = useState(false);

  if (player.loading) return <Loader />;
  if (player.error) return <ErrorAlert error={player.error} onRetry={player.reload} />;
  const p = player.data;
  const s = stats.data;
  const gk = p.isGoalkeeper;

  const openDelete = async () => setConfirm(await api.getPlayerDependencies(id).catch(() => ({ matches: '?' })));
  const doDelete = async () => {
    await api.deletePlayer(id);
    navigate('/players', { replace: true });
  };

  return (
    <>
      <PageHeader title={p.fullName} breadcrumbs={[['Играчи', '/players'], [p.fullName]]}>
        {canModify(p.createdBy) && <Link to={`/players/${id}/edit`} className="btn btn-outline-secondary"><i className="bi bi-pencil me-1" />Уреди</Link>}
        {isAdmin && <button type="button" className="btn btn-outline-danger" onClick={openDelete}><i className="bi bi-trash me-1" />Избриши</button>}
      </PageHeader>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <button type="button" className="btn p-0 border-0 zoomable" onClick={() => setZoom(true)} title="Зумирај">
              <img src={p.photo} className="card-img-top player-photo" alt={p.fullName} />
            </button>
            <div className="card-body">
              <p className="mb-2 d-flex align-items-center gap-2">
                {p.jerseyNumber !== '' && <span className="jersey">{p.jerseyNumber}</span>}
                <span><span className="badge text-bg-dark me-1">{p.position}</span>{positionName(p.position)}</span>
              </p>
              {p.club ? <Link to={`/clubs/${p.club._id}`}>{p.club.name}</Link> : <span className="text-muted">Без клуб</span>}
              {p.externalId && <span className="badge text-bg-info ms-2" title="Увезен од TheSportsDB"><i className="bi bi-cloud-check" /> TheSportsDB</span>}
              <ul className="list-group list-group-flush mt-3">
                <li className="list-group-item d-flex justify-content-between"><span>Датум на раѓање</span><strong>{formatDate(p.dateOfBirth)} ({p.age})</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Националност</span><strong>{p.nationality}</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Висина</span><strong>{p.heightCm ? `${p.heightCm} cm` : '–'}</strong></li>
                <li className="list-group-item d-flex justify-content-between"><span>Рака за шут</span><strong>{handLabel(p.hand)}</strong></li>
              </ul>
              {p.notes && <p className="small mt-3 mb-0"><i className="bi bi-sticky me-1" />{p.notes}</p>}
              {p.bio && (
                <div className="small mt-3">
                  <strong>Биографија (TheSportsDB):</strong>{' '}
                  {showBio ? p.bio : pipe(p.bio, truncate(220))}{' '}
                  {p.bio.length > 220 && <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowBio(!showBio)}>{showBio ? 'помалку' : 'повеќе'}</button>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <ErrorAlert error={stats.error} onRetry={stats.reload} />
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3"><StatCard value={s?.appearances} label="Натпревари" /></div>
            {gk ? (
              <>
                <div className="col-6 col-md-3"><StatCard value={s?.saves} label="Одбрани удари" /></div>
                <div className="col-6 col-md-3"><StatCard value={s?.appearances ? Math.round((s.saves / s.appearances) * 10) / 10 : '–'} label="Одбрани по натпревар" /></div>
              </>
            ) : (
              <>
                <div className="col-6 col-md-3"><StatCard value={s?.goals} label="Голови" /></div>
                <div className="col-6 col-md-3"><StatCard value={s ? (s.shootingPct != null ? `${s.shootingPct}%` : '–') : null} label="Успешност на шут" /></div>
              </>
            )}
            <div className="col-6 col-md-3"><StatCard value={s?.assists} label="Асистенции" /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-7">
              <div className="card h-100">
                <div className="card-header">{gk ? 'Одбрани по натпревар' : 'Голови и шутови по натпревар'}</div>
                <div className="card-body">
                  {s?.timeline?.length ? (
                    <BarChart
                      height={250}
                      labels={s.timeline.map((t) => formatDate(t.date))}
                      datasets={gk
                        ? [{ label: 'Одбрани', data: s.timeline.map((t) => t.saves) }]
                        : [{ label: 'Голови', data: s.timeline.map((t) => t.goals), backgroundColor: COLORS.orange }, { label: 'Шутови', data: s.timeline.map((t) => t.shots), backgroundColor: COLORS.navy }]}
                    />
                  ) : <EmptyState icon="bi-graph-up" text="Нема одиграни натпревари." />}
                </div>
              </div>
            </div>
            <div className="col-md-5">
              <div className="card h-100">
                <div className="card-header">Шутови (погодени / промашени)</div>
                <div className="card-body">
                  {s?.shots ? (
                    <DoughnutChart height={250} labels={['Гол', 'Промашен шут']} values={[s.goals, s.shots - s.goals]} colors={[COLORS.green, COLORS.red]} />
                  ) : <EmptyState icon="bi-pie-chart" text="Нема шутови." />}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Натпревари во сезоната</div>
            <div className="table-responsive">
              <table className="table table-sm mb-0 align-middle">
                <thead><tr><th>Датум</th><th>Натпревар</th><th>Гол.</th><th>Шут.</th><th>Ас.</th><th>Одбр.</th><th title="исклучувања 2 мин.">2'</th></tr></thead>
                <tbody>
                  {(s?.timeline || []).slice().reverse().map((t) => (
                    <tr key={t.matchId}>
                      <td className="text-nowrap">{formatDate(t.date)}</td>
                      <td><Link to={`/matches/${t.matchId}`}>{t.label}</Link><br /><small className="text-muted">{t.competition}</small></td>
                      <td className="fw-bold">{t.goals}</td><td>{t.shots}</td><td>{t.assists}</td><td>{t.saves}</td><td>{t.suspensions}</td>
                    </tr>
                  ))}
                  {s && s.timeline.length === 0 && <tr><td colSpan={7} className="text-muted">Играчот сè уште нема настапи.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ImageZoomModal show={zoom} src={p.photo} alt={p.fullName} onHide={() => setZoom(false)} />
      <ConfirmModal show={!!confirm} title="Потврди бришење" confirmText="Избриши" onCancel={() => setConfirm(null)} onConfirm={doDelete}>
        <p>Дали сте сигурни дека сакате да го избришете играчот <strong>{p.fullName}</strong>?</p>
        <div className="alert alert-warning small mb-0">
          Ќе биде избришана и неговата статистика од <strong>{confirm?.matches} натпревари</strong>. Акцијата не може да се врати.
        </div>
      </ConfirmModal>
    </>
  );
}
