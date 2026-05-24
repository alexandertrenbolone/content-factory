import { useEffect, useState } from 'react';
import { HardDrive, CheckCircle, Circle, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface StorageConnection {
  provider: string;
  folderName: string;
}

const storageOptions = [
  { id: 'google', name: 'Google Drive', desc: 'Сохранять посты в Google Drive', icon: '📁' },
  { id: 'yandex', name: 'Яндекс Диск',  desc: 'Сохранять посты на Яндекс Диск',  icon: '☁️' },
];

export default function Storage() {
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get('connected');
  const justError = searchParams.get('error');
  const [disconnectProvider, setDisconnectProvider] = useState<string | null>(null);

  useEffect(() => {
    api.get<StorageConnection[]>('/storage/status')
      .then(setConnections)
      .finally(() => setLoading(false));
  }, []);

  async function connect(provider: string) {
    try {
      const data = await api.get<{ url: string }>(`/storage/${provider}/auth`);
      window.location.href = data.url;
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function disconnect(provider: string) {
    await api.del(`/storage/${provider}`);
    setConnections((c) => c.filter((x) => x.provider !== provider));
    setDisconnectProvider(null);
  }

  return (
    <div className="p-8 max-w-3xl">
      <ConfirmDialog
        open={!!disconnectProvider}
        title="Отключить хранилище?"
        description="Посты перестанут сохраняться в облако. Уже сохранённые файлы останутся."
        confirmLabel="Отключить"
        variant="danger"
        onConfirm={() => disconnectProvider && disconnect(disconnectProvider)}
        onCancel={() => setDisconnectProvider(null)}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Хранилище</h1>
        <p className="text-sm text-muted mt-1">Подключите облачное хранилище для медиафайлов</p>
      </div>

      {justConnected && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-accent-dim border border-accent/20 text-accent text-sm animate-slide-up">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {justConnected === 'google' ? 'Google Drive' : 'Яндекс Диск'} успешно подключён!
        </div>
      )}
      {justError && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-up">
          <span className="flex-shrink-0">✕</span>
          Подключение отменено или доступ запрещён.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4 stagger">
          {storageOptions.map(({ id, name, desc, icon }) => {
            const conn = connections.find((c) => c.provider === id);
            return (
              <Card key={id} hover>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl">
                      {icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{name}</p>
                        {conn ? (
                          <CheckCircle className="w-3.5 h-3.5 text-accent" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-muted" />
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {conn ? `Подключён · папка: ${conn.folderName}` : desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {conn && (
                      <Button variant="danger" size="sm" onClick={() => setDisconnectProvider(id)}>
                        Отключить
                      </Button>
                    )}
                    <Button
                      variant={conn ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={() => connect(id)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {conn ? 'Переподключить' : 'Подключить'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
