/** Small reusable UI building blocks used across all pages. */
import { Link } from 'react-router-dom';
import { pointsColor, pointsLabel, MATCH_STATUS, FORM, initials } from '../pipes';
import { crestUri } from '../utils/graphics';

/** Page title block: small "eyebrow" line, big uppercase title, subtitle and action buttons. */
export function PageHeader({ title, icon, eyebrow, subtitle, children, breadcrumbs }) {
  return (
    <div className="page-head">
      {breadcrumbs && (
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            {breadcrumbs.map(([label, to]) => (
              <li key={label} className={`breadcrumb-item${to ? '' : ' active'}`}>{to ? <Link to={to}>{label}</Link> : label}</li>
            ))}
          </ol>
        </nav>
      )}
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div className="min-w-0">
          {(eyebrow || icon) && <div className="eyebrow">{icon && <i className={`bi ${icon} me-1`} />}{eyebrow || 'HandballHub'}</div>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children && <div className="d-flex flex-wrap gap-2 align-items-center">{children}</div>}
      </div>
    </div>
  );
}

export function Loader({ text = 'Се вчитува...' }) {
  return (
    <div className="text-center py-5 text-muted">
      <div className="spinner-grow text-lime mb-2" role="status" style={{ color: '#d4ff3f' }} />
      <div className="small">{text}</div>
    </div>
  );
}

export function ErrorAlert({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center gap-2" role="alert">
      <span><i className="bi bi-exclamation-octagon me-2" />{error.message || String(error)}</span>
      {onRetry && <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Обиди се повторно</button>}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', text, children }) {
  return (
    <div className="empty">
      <i className={`bi ${icon}`} />
      <p>{text}</p>
      {children}
    </div>
  );
}

/** Points of a prediction (0–5, or "?" while the match is not played) */
export function PointsBadge({ points, size = '' }) {
  const cls = { success: 'chip-lime', primary: 'chip-blue', danger: 'chip-coral', light: '' }[pointsColor(points)];
  return (
    <span className={`chip ${cls} ${size}`} title={pointsLabel(points)}>
      {points == null ? '? п.' : `+${points} п.`}
    </span>
  );
}

export function MatchStatusBadge({ status }) {
  const s = MATCH_STATUS[status] || { label: status };
  return status === 'scheduled'
    ? <span className="chip chip-blue"><i className="bi bi-clock" />{s.label}</span>
    : <span className="chip">{s.label}</span>;
}

/** Last results of a club: П (win) / Н (draw) / И (loss) */
export function FormDots({ form = [] }) {
  if (!form.length) return <span className="text-muted">–</span>;
  const bg = { W: '#d4ff3f', D: '#8b95ab', L: '#ff5a3c' };
  return (
    <span className="text-nowrap">
      {form.map((r, i) => (
        <span key={`${r}-${i}`} className="form-dot" style={{ background: bg[r] }} title={FORM[r]?.title}>{FORM[r]?.label}</span>
      ))}
    </span>
  );
}

/** Club crest: the real logo if there is one, otherwise a generated shield in the club colours. */
export function ClubLogo({ club, size = 40 }) {
  if (!club) return null;
  return <img src={club.logoUrl || crestUri(club.name)} alt="" width={size} height={size} className="crest" title={club.name} />;
}

export function Avatar({ name, admin = false }) {
  return <span className="avatar" style={admin ? { color: '#ff5a3c' } : undefined} title={name}>{initials(name)}</span>;
}

/** Stat tile: label, big number and an icon */
export function StatCard({ value, label, icon }) {
  return (
    <div className="tile">
      {icon && <i className={`bi ${icon} tile-icon`} />}
      <div className="label">{label}</div>
      <div className="value">{value ?? '–'}</div>
    </div>
  );
}

/** Pagination that works with ?page= in the URL */
export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav aria-label="Страници" className="mt-3">
      <ul className="pagination justify-content-center">
        <li className={`page-item${page <= 1 ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page - 1)} aria-label="Претходна">‹</button></li>
        {nums.map((n, i) => (
          <li key={n} className={`page-item${n === page ? ' active' : ''}`}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="page-link disabled d-inline-block">…</span>}
            <button type="button" className="page-link d-inline-block" onClick={() => onChange(n)}>{n}</button>
          </li>
        ))}
        <li className={`page-item${page >= pages ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page + 1)} aria-label="Следна">›</button></li>
      </ul>
    </nav>
  );
}
