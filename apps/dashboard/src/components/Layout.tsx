import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/client.js';

const nav = [
  { to: '/dashboard', label: 'Overview', exact: true },
  { to: '/dashboard/wallet', label: 'Wallet' },
  { to: '/dashboard/templates', label: 'Templates' },
  { to: '/dashboard/batches', label: 'Batches' },
  { to: '/dashboard/api-keys', label: 'API Keys' },
  { to: '/dashboard/webhooks', label: 'Webhooks' },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['me'], queryFn: getMe });

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-4 border-b border-gray-700">
          <span className="font-bold text-lg tracking-tight">DocGen</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {nav.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 space-y-1">
          <NavLink
            to="/dashboard/admin"
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            Admin
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded text-sm font-medium text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {data && (
              <>
                <span className="font-medium text-gray-900">
                  {data.tenant.name}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                  {data.wallet.balance.toLocaleString()} credits
                </span>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
