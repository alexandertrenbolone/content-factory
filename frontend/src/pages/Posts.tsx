import { useEffect, useState, useCallback, useRef } from 'react';
import { Newspaper, ChevronDown, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface Post {
  id: string;
  sourceTitle: string;
  generatedText: string;
  status: 'pending' | 'published' | 'failed';
  createdAt: string;
  publishedAt: string | null;
  sourceUrl: string;
  topic?: { name: string };
}

interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface ConfirmState {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const statusMap = {
  published: { label: 'Опубликован', variant: 'green' as const },
  pending: { label: 'Ожидает', variant: 'yellow' as const },
  failed: { label: 'Ошибка', variant: 'red' as const },
};

const filters = [
  { key: 'all', label: 'Все' },
  { key: 'published', label: 'Опубликованы' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'failed', label: 'Ошибки' },
];

const emptyConfirm: ConfirmState = { open: false, title: '', confirmLabel: 'Удалить', onConfirm: () => {} };

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);   // только первая загрузка
  const [switching, setSwitching] = useState(false); // смена фильтра без skeleton
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(emptyConfirm);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const fetchPosts = useCallback(async (reset: boolean, curFilter: string, curCursor: string | null) => {
    const params = new URLSearchParams();
    if (curFilter !== 'all') params.set('status', curFilter);
    if (!reset && curCursor) params.set('cursor', curCursor);

    const data = await api.get<PostsResponse>(`/posts?${params}`);
    setPosts((prev) => (reset ? data.posts : [...prev, ...data.posts]));
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    setNextCursor(null);
    if (isFirstLoad.current) {
      // Первая загрузка — показываем skeleton
      isFirstLoad.current = false;
      setLoading(true);
      fetchPosts(true, filter, null).finally(() => setLoading(false));
    } else {
      // Смена фильтра — обновляем посты на месте без skeleton
      setSwitching(true);
      fetchPosts(true, filter, null).finally(() => setSwitching(false));
    }
  }, [filter, fetchPosts]);

  async function loadMore() {
    setLoadingMore(true);
    await fetchPosts(false, filter, nextCursor);
    setLoadingMore(false);
  }

  function askRemove(id: string) {
    setConfirm({
      open: true,
      title: 'Удалить пост?',
      description: 'Пост будет удалён без возможности восстановления.',
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setConfirm(emptyConfirm);
        await api.del(`/posts/${id}`);
        setPosts((p) => p.filter((x) => x.id !== id));
      },
    });
  }

  async function publishNow(id: string) {
    if (publishingIds.has(id)) return;
    setPublishingIds((s) => new Set(s).add(id));
    try {
      await api.post(`/posts/${id}/publish`, {});
      // Авто-обновление через 5 сек — worker обработает job за это время (delay=0)
      setTimeout(() => fetchPosts(true, filter, null), 5000);
    } catch (e: any) {
      console.error('Publish failed:', e.message);
    } finally {
      setPublishingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  function askClearQueue() {
    const pendingCount = posts.filter((p) => p.status === 'pending' || p.status === 'failed').length;
    setConfirm({
      open: true,
      title: 'Очистить очередь?',
      description: `Удалит ${pendingCount} неопубликованных постов и очистит все запланированные задания.`,
      confirmLabel: 'Очистить',
      onConfirm: async () => {
        setConfirm(emptyConfirm);
        await api.post('/posts/clear-queue', {});
        fetchPosts(true, filter, null);
      },
    });
  }

  return (
    <div className="p-8 max-w-5xl">
      <ConfirmDialog
        {...confirm}
        variant="danger"
        onCancel={() => setConfirm(emptyConfirm)}
      />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Посты</h1>
          <p className="text-sm text-muted mt-1">Все сгенерированные и опубликованные посты</p>
        </div>
        <Button variant="danger" size="sm" onClick={askClearQueue}>
          Очистить очередь
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 w-fit mb-6 border border-white/[0.06]">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
              filter === key
                ? 'bg-accent text-black shadow-glow-sm'
                : 'text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 && !switching ? (
        <div className="rounded-xl border border-white/[0.07] p-16 text-center">
          <Newspaper className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Постов нет</p>
        </div>
      ) : (
        <>
          <div className={`rounded-xl border border-white/[0.07] overflow-hidden transition-opacity duration-150 ${switching ? 'opacity-50' : 'opacity-100'}`}>
            {posts.map((post) => {
              const s = statusMap[post.status];
              const isExpanded = expanded === post.id;
              return (
                <div key={post.id} className="border-b border-white/[0.05] last:border-0">
                  <div
                    className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : post.id)}
                  >
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{post.sourceTitle}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{post.generatedText}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {post.topic && (
                        <span className="text-xs text-muted/60 hidden sm:block">{post.topic.name}</span>
                      )}
                      <span className="text-xs text-muted/60">
                        {new Date(post.createdAt).toLocaleString('ru', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
                        <p className="text-sm text-dim leading-relaxed whitespace-pre-wrap">{post.generatedText}</p>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                          <a
                            href={post.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:text-green-400 transition-colors"
                          >
                            Источник →
                          </a>
                          {post.publishedAt && (
                            <span className="text-xs text-muted">
                              Опубликован: {new Date(post.publishedAt).toLocaleString('ru')}
                            </span>
                          )}
                          <div className="flex items-center gap-2 ml-auto">
                            {(post.status === 'pending' || post.status === 'failed') && (
                              <Button
                                size="sm"
                                loading={publishingIds.has(post.id)}
                                disabled={publishingIds.has(post.id)}
                                onClick={(e) => { e.stopPropagation(); publishNow(post.id); }}
                              >
                                Опубликовать
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); askRemove(post.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Удалить
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 py-3 rounded-xl border border-white/[0.07] text-sm text-muted hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
