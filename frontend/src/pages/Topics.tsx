import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface Topic {
  id: string;
  name: string;
  llmProvider: string;
  imageProvider: string | null;
  systemPrompt: string;
  postFormat: string;
  scheduleMinutes: number;
  autoPublish: boolean;
  socialAccountId: string;
  isActive: boolean;
  socialAccount?: { id: string; platform: string; label: string };
}

interface SocialAccount {
  id: string;
  platform: string;
  label: string;
}

interface LlmKey {
  provider: string;
}

const llmProviders = ['openai', 'anthropic', 'gemini', 'deepseek', 'openrouter', 'groq'];
const imgProviders = [
  { id: 'pollinations', label: 'Pollinations (бесплатно)' },
  { id: 'openai',       label: 'OpenAI DALL-E' },
  { id: 'fal',          label: 'FAL.ai' },
];
const platformLabels: Record<string, string> = {
  telegram: 'Telegram', vk: 'ВКонтакте',
};

interface FormFieldsProps {
  f: typeof defaultForm;
  setF: (v: typeof defaultForm) => void;
  err: string;
  socials: SocialAccount[];
}

function FormFields({ f, setF, err, socials }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <Input
        label="Название темы"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
        placeholder="Новости для Telegram"
        required
      />
      <div>
        <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">
          Системный промпт
        </label>
        <textarea
          value={f.systemPrompt}
          onChange={(e) => setF({ ...f, systemPrompt: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-colors resize-none"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">LLM провайдер</label>
          <select
            value={f.llmProvider}
            onChange={(e) => setF({ ...f, llmProvider: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {llmProviders.map((p) => <option key={p} value={p} className="bg-card">{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">Image провайдер (необязательно)</label>
          <select
            value={f.imageProvider}
            onChange={(e) => setF({ ...f, imageProvider: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="" className="bg-card">Без изображений</option>
            {imgProviders.map((p) => <option key={p.id} value={p.id} className="bg-card">{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-1.5">Соцсеть</label>
          <select
            value={f.socialAccountId}
            onChange={(e) => setF({ ...f, socialAccountId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/50"
            required
          >
            <option value="" className="bg-card">Выберите аккаунт</option>
            {socials.map((s) => (
              <option key={s.id} value={s.id} className="bg-card">
                {platformLabels[s.platform] || s.platform} — {s.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Интервал публикации (мин)"
          type="number"
          min="1"
          value={f.scheduleMinutes}
          onChange={(e) => setF({ ...f, scheduleMinutes: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-dim uppercase tracking-wide block mb-2">Режим публикации</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: true,  icon: '⚡', title: 'Автопостинг',    desc: `Публикуется через ${f.scheduleMinutes} мин` },
            { value: false, icon: '✋', title: 'Ручная проверка', desc: 'Одобряйте каждый пост вручную' },
          ] as const).map(({ value, icon, title, desc }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setF({ ...f, autoPublish: value })}
              className={`p-3 rounded-lg border text-left transition-all ${
                f.autoPublish === value
                  ? 'border-accent/50 bg-accent/10 text-white'
                  : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/20'
              }`}
            >
              <div className="text-base mb-1">{icon}</div>
              <div className="text-xs font-medium">{title}</div>
              <div className="text-xs opacity-70 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

const defaultForm = {
  name: '',
  systemPrompt: 'Ты редактор. Напиши короткий пост на основе этой новости. Пиши по-русски, без вступлений.',
  llmProvider: 'openrouter',
  imageProvider: '',
  socialAccountId: '',
  scheduleMinutes: '60',
  postFormat: 'text',
  autoPublish: true as boolean,
};

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [socials, setSocials] = useState<SocialAccount[]>([]);
  const [llmKeys, setLlmKeys] = useState<LlmKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(defaultForm);

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  interface ConfirmState { open: boolean; title: string; description?: string; confirmLabel: string; onConfirm: () => void; }
  const emptyConfirm: ConfirmState = { open: false, title: '', confirmLabel: 'Удалить', onConfirm: () => {} };
  const [confirm, setConfirm] = useState<ConfirmState>(emptyConfirm);

  async function load() {
    const [t, s, k] = await Promise.all([
      api.get<Topic[]>('/topics'),
      api.get<SocialAccount[]>('/social'),
      api.get<LlmKey[]>('/keys/llm'),
    ]);
    setTopics(t);
    setSocials(s);
    setLlmKeys(k);
    if (s.length > 0 && !form.socialAccountId) {
      setForm((f) => ({ ...f, socialAccountId: s[0].id }));
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const mins = parseInt(form.scheduleMinutes);
    if (isNaN(mins) || mins < 1 || mins > 10080) {
      setError('Интервал должен быть от 1 до 10080 минут');
      return;
    }
    setSaving(true);
    try {
      await api.post('/topics', {
        ...form,
        scheduleMinutes: mins,
        imageProvider: form.imageProvider || null,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, name: '', systemPrompt: defaultForm.systemPrompt }));
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(topic: Topic) {
    setEditingTopic(topic);
    setEditForm({
      name: topic.name,
      systemPrompt: topic.systemPrompt,
      llmProvider: topic.llmProvider,
      imageProvider: topic.imageProvider || '',
      socialAccountId: topic.socialAccountId,
      scheduleMinutes: String(topic.scheduleMinutes),
      postFormat: topic.postFormat || 'text',
      autoPublish: topic.autoPublish ?? true,
    });
    setEditError('');
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTopic) return;
    setEditError('');
    const mins = parseInt(editForm.scheduleMinutes);
    if (isNaN(mins) || mins < 1 || mins > 10080) {
      setEditError('Интервал должен быть от 1 до 10080 минут');
      return;
    }
    setEditSaving(true);
    try {
      await api.put(`/topics/${editingTopic.id}`, {
        ...editForm,
        scheduleMinutes: mins,
        imageProvider: editForm.imageProvider || null,
      });
      setEditingTopic(null);
      await load();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  function askRemove(topic: Topic) {
    setConfirm({
      open: true,
      title: `Удалить тему «${topic.name}»?`,
      description: 'Все источники, привязанные к этой теме, потеряют связь. Посты останутся.',
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setConfirm(emptyConfirm);
        await api.del(`/topics/${topic.id}`);
        setTopics((t) => t.filter((x) => x.id !== topic.id));
      },
    });
  }

  return (
    <div className="p-8 max-w-4xl">
      <ConfirmDialog
        {...confirm}
        variant="danger"
        onCancel={() => setConfirm(emptyConfirm)}
      />
      {/* Edit modal */}
      {editingTopic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingTopic(null); }}
        >
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white">Редактировать тему</h2>
              <button onClick={() => setEditingTopic(null)} className="text-muted hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <FormFields f={editForm} setF={setEditForm} err={editError} socials={socials} />
              <div className="flex gap-2 pt-4 mt-4 border-t border-white/[0.06]">
                <Button type="submit" loading={editSaving}>Сохранить</Button>
                <Button type="button" variant="ghost" onClick={() => setEditingTopic(null)}>Отмена</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Темы</h1>
          <p className="text-sm text-muted mt-1">Настройте как и куда генерировать контент</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'ghost' : 'primary'}>
          {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Свернуть' : 'Новая тема'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6 animate-slide-up">
          <h2 className="text-sm font-medium text-white mb-4">Новая тема</h2>
          <form onSubmit={save}>
            <FormFields f={form} setF={setForm} err={error} socials={socials} />
            <div className="flex gap-2 pt-4 mt-2">
              <Button type="submit" loading={saving}>Сохранить тему</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Отмена</Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] p-12 text-center">
          <FileText className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Тем нет — создайте первую</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden stagger">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center gap-4 p-4 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{topic.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="gray">{topic.llmProvider}</Badge>
                  {topic.socialAccount && (
                    <Badge variant="blue">
                      {platformLabels[topic.socialAccount.platform] || topic.socialAccount.platform}
                    </Badge>
                  )}
                  <span className="text-xs text-muted">каждые {topic.scheduleMinutes} мин</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(topic)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => askRemove(topic)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
