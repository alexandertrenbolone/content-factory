import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { api, setToken } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string }>('/auth/register', {
        email,
        password,
        name,
        companyName: company,
      });
      setToken(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-semibold text-white">Content Factory</span>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-card p-7">
          <h1 className="text-lg font-semibold text-white mb-1">Регистрация</h1>
          <p className="text-sm text-muted mb-6">Создайте аккаунт для вашей компании</p>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Александр"
              required
            />
            <Input
              label="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Моя компания"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full mt-2">
              Создать аккаунт
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-accent hover:text-green-400 transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
