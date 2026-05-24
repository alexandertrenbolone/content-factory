import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/api';
import {
  LayoutDashboard, Rss, FileText, Newspaper,
  Key, HardDrive, Share2, LogOut, Zap,
} from 'lucide-react';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/sources', icon: Rss, label: 'Источники' },
  { to: '/topics', icon: FileText, label: 'Темы' },
  { to: '/posts', icon: Newspaper, label: 'Посты' },
  { to: '/keys', icon: Key, label: 'API ключи' },
  { to: '/storage', icon: HardDrive, label: 'Хранилище' },
  { to: '/social', icon: Share2, label: 'Соцсети' },
];

export default function Layout() {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0c0c0f]">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-glow-sm">
              <Zap className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              Content Factory
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-accent-dim text-accent font-medium'
                    : 'text-muted hover:text-dim hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
