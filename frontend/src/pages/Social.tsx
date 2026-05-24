import { useEffect, useState } from 'react';
import { Share2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface SocialAccount {
  id: string;
  platform: string;
  label: string;
  isActive: boolean;
}

const platformInfo: Record<string, { name: string; color: string; icon: string }> = {
  telegram: { name: 'Telegram', color: 'text-blue-400', icon: '✈️' },
  vk: { name: 'ВКонтакте', color: 'text-blue-500', icon: '🔵' },
};

type PlatformId = 'telegram' | 'vk';

interface TelegramForm { botToken: string; channelId: string; label: string }
interface VkForm { accessToken: string; groupId: string; label: string }

export default function Social() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<PlatformId | null>(null);

  const [tgForm, setTgForm] = useState<TelegramForm>({ botToken: '', channelId: '', label: '' });
  const [vkForm, setVkForm] = useState<VkForm>({ accessToken: '', groupId: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.get<SocialAccount[]>('/social');
    setAccounts(data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function addTelegram(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // Клиентская валидация
    const token = tgForm.botToken.trim();
    const chatId = tgForm.channelId.trim();
    if (!/^\d+:[\w-]{20,}$/.test(token)) {
      setError('Неверный формат токена. Пример: 123456789:AABBccDDeeFF...');
      return;
    }
    if (!/^(@[\w]{3,}|-?\d+)$/.test(chatId)) {
      setError('ID канала должен быть в формате @username или -1001234567890');
      return;
    }
    setSaving(true);
    try {
      await api.post('/social', {
        platform: 'telegram',
        label: tgForm.label || tgForm.channelId,
        creds: { botToken: token, channelId: chatId },
      });
      setTgForm({ botToken: '', channelId: '', label: '' });
      setShowForm(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addVk(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // Клиентская валидация
    if (vkForm.accessToken.trim().length < 20) {
      setError('Токен VK слишком короткий — скопируйте полный токен из настроек группы');
      return;
    }
    if (!/^\d+$/.test(vkForm.groupId.trim())) {
      setError('ID группы должен быть числом без минуса (например: 238941785)');
      return;
    }
    setSaving(true);
    try {
      await api.post('/social', {
        platform: 'vk',
        label: vkForm.label || `VK Group ${vkForm.groupId}`,
        creds: { accessToken: vkForm.accessToken.trim(), groupId: vkForm.groupId.trim() },
      });
      setVkForm({ accessToken: '', groupId: '', label: '' });
      setShowForm(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/social/${id}`);
    setAccounts((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Соцсети</h1>
          <p className="text-sm text-muted mt-1">Подключите каналы для публикации</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showForm === 'telegram' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowForm(showForm === 'telegram' ? null : 'telegram')}
          >
            <Plus className="w-4 h-4" /> Telegram
          </Button>
          <Button
            variant={showForm === 'vk' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowForm(showForm === 'vk' ? null : 'vk')}
          >
            <Plus className="w-4 h-4" /> ВКонтакте
          </Button>
        </div>
      </div>

      {/* Telegram form */}
      {showForm === 'telegram' && (
        <Card className="mb-6 animate-slide-up">
          <h2 className="text-sm font-medium text-white mb-4">Подключить Telegram</h2>
          <form onSubmit={addTelegram} className="space-y-4">
            <Input
              label="Токен бота"
              value={tgForm.botToken}
              onChange={(e) => setTgForm({ ...tgForm, botToken: e.target.value })}
              placeholder="1234567890:AABBcc..."
              required
            />
            <Input
              label="ID канала или @username"
              value={tgForm.channelId}
              onChange={(e) => setTgForm({ ...tgForm, channelId: e.target.value })}
              placeholder="@mychannel или -1001234567890"
              required
            />
            <Input
              label="Название (для отображения)"
              value={tgForm.label}
              onChange={(e) => setTgForm({ ...tgForm, label: e.target.value })}
              placeholder="Мой Telegram канал"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Подключить</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      {/* VK form */}
      {showForm === 'vk' && (
        <Card className="mb-6 animate-slide-up">
          <h2 className="text-sm font-medium text-white mb-4">Подключить ВКонтакте</h2>
          <form onSubmit={addVk} className="space-y-4">
            <Input
              label="Access Token группы"
              value={vkForm.accessToken}
              onChange={(e) => setVkForm({ ...vkForm, accessToken: e.target.value })}
              placeholder="vk1.a...."
              required
            />
            <Input
              label="ID группы (без минуса)"
              value={vkForm.groupId}
              onChange={(e) => setVkForm({ ...vkForm, groupId: e.target.value })}
              placeholder="123456789"
              required
            />
            <Input
              label="Название (для отображения)"
              value={vkForm.label}
              onChange={(e) => setVkForm({ ...vkForm, label: e.target.value })}
              placeholder="Моя группа ВК"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Подключить</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Accounts list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-18 rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] p-12 text-center">
          <Share2 className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Соцсетей нет — подключите Telegram или ВКонтакте</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden stagger">
          {accounts.map((acc) => {
            const info = platformInfo[acc.platform] ?? { name: acc.platform, color: 'text-dim', icon: '🔗' };
            return (
              <div
                key={acc.id}
                className="flex items-center gap-4 p-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg">
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{acc.label}</p>
                    <CheckCircle className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <p className={`text-xs mt-0.5 ${info.color}`}>{info.name}</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => remove(acc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
