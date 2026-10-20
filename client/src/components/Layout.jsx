import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { initials } from '../pipes';
import { ClubLogo } from './common';

const Ball = () => <img src="/favicon.svg" alt="" className="brand-ball" />;

/** Navigation groups – items depend on the role (guest / user / admin). */
function useNavGroups() {
  const { isLoggedIn, isAdmin } = useAuth();
  return [
    ['Matchday', [
      ['/', 'Почетна', 'bi-lightning-charge-fill', true],
      ['/matches', 'Натпревари', 'bi-calendar2-week'],
      ['/standings', 'Табела', 'bi-bar-chart-steps'],
    ]],
    ['Игра со прогнози', [
      ['/leaderboard', 'Ранг-листа', 'bi-trophy'],
      ...(isLoggedIn ? [['/my-predictions', 'Мои прогнози', 'bi-bullseye']] : []),
    ]],
    ['База', [
      ['/players', 'Играчи', 'bi-person-badge'],
      ['/clubs', 'Клубови', 'bi-shield-shaded'],
      ['/search', 'Пребарување', 'bi-search'],
      ['/dashboard', 'Статистика', 'bi-graph-up'],
      ...(isLoggedIn ? [['/external', 'TheSportsDB увоз', 'bi-cloud-arrow-down']] : []),
    ]],
    ...(isLoggedIn ? [['Профил', [
      ['/history', 'Историја', 'bi-clock-history'],
      ...(isAdmin ? [['/admin/users', 'Корисници', 'bi-people'], ['/db', 'База (/db)', 'bi-database']] : []),
    ]]] : []),
  ];
}

function SideNav({ onNavigate }) {
  const groups = useNavGroups();
  return (
    <nav className="side-nav" aria-label="Главно мени">
      {groups.map(([title, links]) => (
        <div key={title}>
          <div className="side-group">{title}</div>
          {links.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} className="side-link" onClick={onNavigate}>
              <i className={`bi ${icon}`} />{label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function UserBox() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  if (!isLoggedIn) {
    return (
      <div className="side-user d-grid gap-2">
        <Link to="/register" className="btn btn-primary btn-sm">Регистрирај се</Link>
        <Link to="/login" className="btn btn-ghost btn-sm">Најава</Link>
      </div>
    );
  }
  return (
    <div className="side-user d-flex align-items-center gap-2">
      <span className="avatar">{initials(user.username)}</span>
      <div className="min-w-0 flex-grow-1">
        <div className="fw-semibold text-truncate">{user.username}</div>
        <small className={isAdmin ? 'text-coral' : 'text-muted'}>{isAdmin ? 'администратор' : 'навивач'}</small>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" title="Одјава" aria-label="Одјава" onClick={() => { logout(); navigate('/'); }}>
        <i className="bi bi-box-arrow-right" />
      </button>
    </div>
  );
}

/** Scrolling strip with the latest results (like a TV ticker). */
function Ticker() {
  const { data } = useAsync(() => api.getMatches({ status: 'finished', limit: 10 }).catch(() => null), []);
  const items = data?.items || [];
  if (!items.length) return null;
  const row = items.map((m) => (
    <Link key={m._id} to={`/matches/${m._id}`} className="ticker-item">
      <ClubLogo club={m.homeClub} size={18} /> {m.homeClub?.name} <strong>{m.score}</strong> {m.awayClub?.name} <ClubLogo club={m.awayClub} size={18} />
    </Link>
  ));
  return (
    <div className="ticker d-print-none" aria-label="Последни резултати">
      <div className="ticker-label"><span className="live-dot me-2" style={{ background: '#fff' }} />РЕЗУЛТАТИ</div>
      {/* the row is rendered twice so the animation loops without a gap */}
      <div className="ticker-track">{row}<span aria-hidden="true">{row}</span></div>
    </div>
  );
}

export function AppFooter() {
  return (
    <footer className="footer d-flex flex-wrap justify-content-between gap-2">
      <span>&copy; {new Date().getFullYear()} HandballHub · Веб програмирање</span>
      <span>
        <a href="/api/docs/" target="_blank" rel="noreferrer">REST API (Swagger)</a> · Податоци: <a href="https://www.thesportsdb.com" target="_blank" rel="noreferrer">TheSportsDB</a>
      </span>
    </footer>
  );
}

/** App shell: sidebar (desktop), top bar + off-canvas menu + bottom tabs (mobile), results ticker. */
export default function Layout() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [location.pathname, location.search]);

  const tabs = [
    ['/', 'Почетна', 'bi-lightning-charge-fill', true],
    ['/matches', 'Натпревари', 'bi-calendar2-week'],
    ['/standings', 'Табела', 'bi-bar-chart-steps'],
    ['/leaderboard', 'Прогнози', 'bi-trophy'],
    ...(isLoggedIn ? [['/my-predictions', 'Мои', 'bi-bullseye']] : [['/login', 'Најава', 'bi-person-circle']]),
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand"><Ball /> HANDBALL<span className="text-lime">HUB</span></Link>
        <SideNav />
        <UserBox />
      </aside>

      <div className="content">
        <header className="topbar">
          <Link to="/" className="brand"><Ball /> HANDBALL<span className="text-lime">HUB</span></Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMenu(true)} aria-label="Мени"><i className="bi bi-list fs-5" /></button>
        </header>
        <Ticker />
        <main className="content-inner mx-auto">
          <Outlet />
        </main>
        <AppFooter />
      </div>

      <nav className="bottom-tabs" aria-label="Брзо мени">
        {tabs.map(([to, label, icon, end]) => (
          <NavLink key={to} to={to} end={end}><i className={`bi ${icon}`} />{label}</NavLink>
        ))}
      </nav>

      <Offcanvas show={menu} onHide={() => setMenu(false)} placement="start" style={{ width: 280 }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title as="div" className="brand p-0"><Ball /> HANDBALL<span className="text-lime">HUB</span></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column p-2">
          <SideNav onNavigate={() => setMenu(false)} />
          <UserBox />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
