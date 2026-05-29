import { useEffect, useState } from 'react';
import { Key, CheckCircle, Circle, Trash2, TestTube } from 'lucide-react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface ConnectedKey { provider: string; createdAt: string }

const llmProviders = [
  { id: 'openrouter', name: 'OpenRouter', hint: 'sk-or-v1-...' },
  { id: 'groq', name: 'Groq (бесплатно)', hint: 'gsk_...' },
  { id: 'openai', name: 'OpenAI', hint: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', hint: 'sk-ant-...' },
  { id: 'gemini', name: 'Google Gemini', hint: 'AIza...' },
  { id: 'deepseek', name: 'DeepSeek', hint: 'sk-...' },
];

const imgProviders = [
  { id: 'openai', name: 'OpenAI DALL-E', hint: 'sk-...' },
  { id: 'fal', name: 'FAL.ai', hint: 'fal-...' },
];

function ProviderCard({
  provider,
  name,
  hint,
  connected,
  onSave,
  onDelete,
  onTest,
}: {
  provider: string;
  name: string;
  hint: string;
  connected: boolean;
  onSave: (p: string, key: string) => Promise<void>;
  onDelete: (p: string) => Promise<void>;
  onTest: (p: string) => Promise<string>;
}) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function save() {
    if (key.trim().length < 10) {
      setSaveError('Ключ слишком короткий (минимум 10 символов)');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave(provider, key);
      setKey('');
      setShowInput(false);
    } catch (e: any) {
      setSaveError(e.message || 'Ошибка сохранения ключа');
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult('');
    try {
      const res = await onTest(provider);
      setTestResult(`✓ ${res}`);
    } catch (e: any) {
      setTestResult(`✗ ${e.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted flex-shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-muted">{connected ? 'Подключён' : 'Не подключён'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {connected && (
            <>
              <Button variant="ghost" size="sm" onClick={test} loading={testing}>
                <TestTube className="w-3.5 h-3.5" />
                Тест
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(provider)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {!connected && (
            <Button size="sm" onClick={() => setShowInput((v) => !v)}>
              Добавить ключ
            </Button>
          )}
        </div>
      </div>

      {showInput && (
        <div className="mt-4 animate-slide-up">
          <div className="flex gap-2">
            <Input
              value={key}
              onChange={(e) => { setKey(e.target.value); setSaveError(''); }}
              placeholder={hint}
              className="flex-1"
            />
            <Button onClick={save} loading={saving} disabled={!key}>
              Сохранить
            </Button>
          </div>
          {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
        </div>
      )}
      {testResult && (
        <p className={`mt-3 text-xs break-all ${testResult.startsWith('✓') ? 'text-accent' : 'text-red-400'}`}>
          {testResult}
        </p>
      )}
    </Card>
  );
}

export default function Keys() {
  const [llmKeys, setLlmKeys] = useState<ConnectedKey[]>([]);
  const [imgKeys, setImgKeys] = useState<ConnectedKey[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [l, i] = await Promise.all([
      api.get<ConnectedKey[]>('/keys/llm'),
      api.get<ConnectedKey[]>('/keys/image'),
    ]);
    setLlmKeys(l);
    setImgKeys(i);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function saveLlm(provider: string, apiKey: string) {
    await api.post('/keys/llm', { provider, apiKey });
    await load();
  }

  async function deleteLlm(provider: string) {
    await api.del(`/keys/llm/${provider}`);
    await load();
  }

  async function testLlm(provider: string) {
    const res = await api.post<{ response: string }>('/keys/llm/test', { provider });
    return res.response;
  }

  async function saveImg(provider: string, apiKey: string) {
    await api.post('/keys/image', { provider, apiKey });
    await load();
  }

  async function deleteImg(provider: string) {
    await api.del(`/keys/image/${provider}`);
    await load();
  }

  async function testImg(provider: string) {
    await api.post('/keys/image/test', { provider });
    return 'Ключ работает';
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">API ключи</h1>
        <p className="text-sm text-muted mt-1">Подключите свои ключи — они хранятся зашифрованно</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xs font-medium text-dim uppercase tracking-wide mb-4 flex items-center gap-2">
          <Key className="w-3.5 h-3.5" /> LLM провайдеры
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {llmProviders.map(({ id, name, hint }) => (
              <ProviderCard
                key={id}
                provider={id}
                name={name}
                hint={hint}
                connected={llmKeys.some((k) => k.provider === id)}
                onSave={saveLlm}
                onDelete={deleteLlm}
                onTest={testLlm}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-medium text-dim uppercase tracking-wide mb-4 flex items-center gap-2">
          <Key className="w-3.5 h-3.5" /> Генерация изображений
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {imgProviders.map(({ id, name, hint }) => (
              <ProviderCard
                key={id}
                provider={id}
                name={name}
                hint={hint}
                connected={imgKeys.some((k) => k.provider === id)}
                onSave={saveImg}
                onDelete={deleteImg}
                onTest={testImg}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
