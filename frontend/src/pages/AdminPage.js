import { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { 
  Users, 
  Trash, 
  Shield,
  CircleNotch,
  UserCircle,
  Warning
} from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.list();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await usersAPI.update(userId, { role: newRole });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    setUpdating(userId);
    try {
      await usersAPI.update(userId, { is_active: isActive });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)));
      toast.success(isActive ? 'User activated' : 'User deactivated');
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await usersAPI.delete(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete user';
      toast.error(message);
    }
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

  const roleDescriptions = {
    admin: 'Full system access, user management',
    engineer: 'Upload documents, query all docs',
    technician: 'Query SOPs only',
    viewer: 'Read-only, limited access',
  };

  return (
    <div className="p-6" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-mono font-bold text-white flex items-center gap-3">
            <Shield size={28} className="text-amber-500" />
            USER MANAGEMENT
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage user accounts and role assignments
          </p>
        </div>

        {/* Role Legend */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-zinc-400 uppercase">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(roleDescriptions).map(([role, desc]) => (
                <div key={role} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-sm">
                  <Badge variant="outline" className={`${getRoleBadgeClass(role)} border-0 font-mono text-xs uppercase shrink-0`}>
                    {role}
                  </Badge>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white font-mono flex items-center gap-2">
              <Users size={20} />
              {users.length} USERS
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-24rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <CircleNotch className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20">
                <Users size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500 font-mono">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">User</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Role</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Status</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Created</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow 
                      key={user.id} 
                      data-testid={`user-row-${user.id}`}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-sm bg-zinc-800 flex items-center justify-center">
                            <UserCircle size={24} className="text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-white font-mono text-sm">{user.name}</p>
                            <p className="text-zinc-500 text-xs">{user.email}</p>
                          </div>
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-xs ml-2">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.id === currentUser?.id ? (
                          <Badge variant="outline" className={`${getRoleBadgeClass(user.role)} border-0 font-mono text-xs uppercase`}>
                            {user.role}
                          </Badge>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                            disabled={updating === user.id}
                          >
                            <SelectTrigger 
                              className="w-32 h-8 bg-zinc-950 border-zinc-700 text-white font-mono text-xs"
                              data-testid={`role-select-${user.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                              <SelectItem value="admin" className="text-white font-mono text-xs">Admin</SelectItem>
                              <SelectItem value="engineer" className="text-white font-mono text-xs">Engineer</SelectItem>
                              <SelectItem value="technician" className="text-white font-mono text-xs">Technician</SelectItem>
                              <SelectItem value="viewer" className="text-white font-mono text-xs">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.id === currentUser?.id ? (
                          <div className="flex items-center gap-2">
                            <div className="status-online" />
                            <span className="text-emerald-500 text-xs font-mono">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={(checked) => handleStatusChange(user.id, checked)}
                              disabled={updating === user.id}
                              data-testid={`status-switch-${user.id}`}
                            />
                            <span className={`text-xs font-mono ${user.is_active ? 'text-emerald-500' : 'text-zinc-500'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-500 font-mono text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            disabled={updating === user.id}
                            data-testid={`delete-user-${user.id}`}
                            className="h-8 w-8 p-0 hover:bg-red-500/20"
                          >
                            <Trash size={16} className="text-red-400" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </Card>

        {/* Warning */}
        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-start gap-3">
          <Warning size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-500 font-mono text-sm">Security Notice</p>
            <p className="text-zinc-400 text-xs mt-1">
              Role changes take effect immediately. Users with Admin role have full system access including user management and document deletion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
