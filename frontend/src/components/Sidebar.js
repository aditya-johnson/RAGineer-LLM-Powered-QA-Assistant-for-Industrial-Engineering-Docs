import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Hexagon, 
  ChatCircleDots, 
  Files, 
  UsersThree, 
  Gear,
  SignOut
} from '@phosphor-icons/react';
import { Badge } from '../components/ui/badge';

export const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: ChatCircleDots, label: 'CHAT', permission: null },
    { to: '/documents', icon: Files, label: 'DOCUMENTS', permission: null },
    { to: '/admin', icon: UsersThree, label: 'USERS', permission: 'manage_users' },
    { to: '/settings', icon: Gear, label: 'SETTINGS', permission: null },
  ];

  const getRoleBadgeClass = (role) => {
    const classes = {
      admin: 'role-admin',
      engineer: 'role-engineer',
      technician: 'role-technician',
      viewer: 'role-viewer',
    };
    return classes[role] || classes.viewer;
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen" data-testid="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Hexagon weight="duotone" className="w-10 h-10 text-amber-500" />
          <div>
            <h1 className="text-lg font-mono font-bold text-white tracking-tight">RAGineer</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Industrial QA</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-sm transition-colors ${
                  isActive
                    ? 'sidebar-item-active'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-sm bg-zinc-800 flex items-center justify-center">
            <span className="text-amber-500 font-mono font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{user?.name}</p>
            <Badge variant="outline" className={`${getRoleBadgeClass(user?.role)} border-0 font-mono text-[10px] uppercase`}>
              {user?.role}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="sidebar-logout"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors font-mono"
        >
          <SignOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};
