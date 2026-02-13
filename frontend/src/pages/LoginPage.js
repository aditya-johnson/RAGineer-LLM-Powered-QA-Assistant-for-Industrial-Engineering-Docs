import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Hexagon, Eye, EyeSlash, Warning, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'viewer',
  });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Login successful');
      } else {
        await register(formData);
        toast.success('Account created successfully');
      }
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 industrial-grid">
      <div className="absolute inset-0 scanline pointer-events-none" />
      
      <div className="w-full max-w-md animate-in" data-testid="login-page">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Hexagon weight="duotone" className="w-12 h-12 text-amber-500" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-white tracking-tight">RAGineer</h1>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Industrial QA Intelligence</p>
          </div>
        </div>

        <Card className="bg-zinc-900/90 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-mono text-white">
              {isLogin ? 'SYSTEM ACCESS' : 'REGISTER ACCOUNT'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isLogin 
                ? 'Enter credentials to access the system' 
                : 'Create a new account to get started'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300 font-mono text-xs uppercase">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    type="text"
                    placeholder="John Engineer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                    className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 focus:border-amber-500"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300 font-mono text-xs uppercase">
                  Email Address
                </Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="engineer@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 focus:border-amber-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300 font-mono text-xs uppercase">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 focus:border-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-zinc-300 font-mono text-xs uppercase">
                    Role
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger 
                      data-testid="role-select"
                      className="bg-zinc-950 border-zinc-700 text-white font-mono focus:ring-amber-500"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="admin" className="text-white font-mono">Admin</SelectItem>
                      <SelectItem value="engineer" className="text-white font-mono">Engineer</SelectItem>
                      <SelectItem value="technician" className="text-white font-mono">Technician</SelectItem>
                      <SelectItem value="viewer" className="text-white font-mono">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <Warning size={12} className="text-amber-500" />
                    Role determines access permissions
                  </p>
                </div>
              )}
              
              <Button
                type="submit"
                data-testid="submit-btn"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-mono font-semibold rounded-sm glow-amber"
              >
                {loading ? (
                  <CircleNotch className="w-5 h-5 animate-spin" />
                ) : (
                  isLogin ? 'ACCESS SYSTEM' : 'CREATE ACCOUNT'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-zinc-400 hover:text-amber-500 font-mono transition-colors"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
              </button>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6 font-mono">
          SECURE INDUSTRIAL QA SYSTEM v1.0
        </p>
      </div>
    </div>
  );
}
