import { useEffect, useState } from 'react';
import { Rss, Plus, Trash2, Pencil, X, Check } from 'lucide-react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface Topic {
  id: string;
  name: string;
}

interface Source {
  id: string;
  url: string;
  name: string;
  lastFetched: string | null;
  isActive: boolean;
  topicId: string | null;
  topic: { name: string } | null;
  pollIntervalMinutes: number;
}

const INTERVALS = [
  { value: 10,   label: '10 мин' },
  { value: 30,   label: '30 мин' },
  { value: 60,   label: '1 час' },
  { value: 120,  label: '2 часа' },
  { value: 360,  label: '6 часов' },
  { value: 720,  label: '12 часов' },
  { value: 1440, label: '1 день' },
];

function formatInterval(minutes: number): string {
  return INTERVALS.find((i) => i.value === minutes)?.label ?? `${minutes} мин`;
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [topicId, setTopicId] = useState('');
  const [pollInterval, setPollInterval] = useState('30');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTopicId, setEditTopicId] = useState('');
  const [editPollInterval, setEditPollInterval] = useState('30');
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    const [s, t] = await Promise.all([
      api.get<Source[]>('/sources'),
      api.get<Topic[]>('/topics').catch(() => [] as Topic[]),
    ]);
    setSources(s);
    setTopics(t);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await api.post('/sources', { url, name, topicId: topicId || undefined, pollIntervalMinutes: parseInt(pollInterval) });
      setUrl('');
      setName('');
      setTopicId('');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/sources/${id}`);
    setSources((s) => s.filter((x) => x.id !== id));
  }

  function startEdit(src: Source) {
    setEditingId(src.id);
    setEditName(src.name);
    setEditTopicId(src.topicId || '');
    setEditPollInterval(String(src.pollIntervalMinutes || 30));
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      await api.patch(`/sources/${id}`, { name: editName, topicId: editTopicId || undefined, pollIntervalMinutes: parseInt(editPollInterval) });
      setEditingId(null);
      await load();
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Источники RSS</h1>
          <p className="text-sm text-muted mt-1">Лента новостей для генерации контента</p>
        </div>
      </div>

      {/* Add form */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" /> Добавить источник
        </h2>
        <form onSubmit={add} className="space-y-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Название"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lenta.ru"
                required
              />
            </div>
            <div className="flex-[2]">
              <Input
                label="RSS URL"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://lenta.ru/rss/articles"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">
                Тема (необязательно)
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
              >
                <option value="" className="bg-card">Все активные темы</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id} className="bg-card">{t.name}</option>
                ))}
              </select>
            </div>
            <div className="w-32 flex-shrink-0">
              <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">
                Опрос (мин)
              </label>
              <select
                value={pollInterval}
                onChange={(e) => setPollInterval(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
              >
                {INTERVALS.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-card">{label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" loading={adding}>
              Добавить
            </Button>
          </div>
        </form>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] p-12 text-center">
          <Rss className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Источников нет</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden stagger">
          {sources.map((src) => (
            <div
              key={src.id}
              className="border-b border-white/[0.05] last:border-0"
            >
              {editingId === src.id ? (
                <div className="flex items-center gap-3 p-3 bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Rss className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0 flex gap-2 items-center">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                    <select
                      value={editTopicId}
                      onChange={(e) => setEditTopicId(e.target.value)}
                      className="flex-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
                    >
                      <option value="" className="bg-card">Все темы</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id} className="bg-card">{t.name}</option>
                      ))}
                    </select>
                    <select
                      value={editPollInterval}
                      onChange={(e) => setEditPollInterval(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
                    >
                      {[10, 30, 60, 120, 360].map((m) => (
                        <option key={m} value={m} className="bg-card">{m} мин</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => saveEdit(src.id)} loading={editSaving}>
                      <Check className="w-3.5 h-3.5 text-accent" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Rss className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{src.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted truncate">{src.url}</p>
                      <span className="text-xs text-muted/50 flex-shrink-0">
                        {src.topic ? `→ ${src.topic.name}` : 'Все темы'} · {formatInterval(src.pollIntervalMinutes)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {src.lastFetched ? (
                      <span className="text-xs text-muted/60 flex-shrink-0">
                        {new Date(src.lastFetched).toLocaleString('ru', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted/50 flex-shrink-0">Не проверялся</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => startEdit(src)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(src.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
