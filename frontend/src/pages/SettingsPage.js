import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  UserCircle, 
  EnvelopeSimple, 
  Shield,
  SignOut,
  Key,
  Calendar
} from '@phosphor-icons/react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      admin: 'role-admin',
      engineer: 'role-engineer',
      technician: 'role-technician',
      viewer: 'role-viewer',
    };
    return classes[role] || classes.viewer;
  };

  const rolePermissions = {
    admin: ['Upload documents', 'Delete documents', 'Manage users', 'Query all documents', 'View all documents'],
    engineer: ['Upload documents', 'Query all documents', 'View all documents'],
    technician: ['Query SOPs', 'View SOPs'],
    viewer: ['Query limited', 'View limited documents'],
  };

  return (
    <div className="p-6" data-testid="settings-page">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-mono font-bold text-white mb-6">SETTINGS</h1>

        {/* Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
              <UserCircle size={24} className="text-amber-500" />
              PROFILE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-sm bg-zinc-800 flex items-center justify-center">
                <UserCircle size={40} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-white font-mono text-lg">{user?.name}</p>
                <Badge variant="outline" className={`${getRoleBadgeClass(user?.role)} border-0 font-mono text-xs uppercase mt-1`}>
                  {user?.role}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <EnvelopeSimple size={18} className="text-zinc-500" />
                <span className="text-zinc-400 text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Key size={18} className="text-zinc-500" />
                <span className="text-zinc-400 text-sm font-mono">{user?.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-zinc-500" />
                <span className="text-zinc-400 text-sm">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white font-mono text-lg flex items-center gap-2">
              <Shield size={24} className="text-amber-500" />
              YOUR PERMISSIONS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rolePermissions[user?.role]?.map((permission, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300 text-sm">{permission}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          data-testid="logout-btn"
          variant="outline"
          className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 font-mono"
        >
          <SignOut size={18} className="mr-2" />
          SIGN OUT
        </Button>
      </div>
    </div>
  );
}
