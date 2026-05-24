import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rss, FileText, Newspaper, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

interface Post {
  id: string;
  sourceTitle: string;
  status: 'pending' | 'published' | 'failed';
  createdAt: string;
  generatedText: string;
}

interface Stats {
  sources: number;
  topics: number;
  posts: { total: number; published: number; pending: number; failed: number };
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
  );
}

const statusMap = {
  published: { label: 'Опубликован', variant: 'green' as const },
  pending: { label: 'Ожидает', variant: 'yellow' as const },
  failed: { label: 'Ошибка', variant: 'red' as const },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/sources'),
      api.get<any[]>('/topics'),
      api.get<{ posts: Post[] }>('/posts'),
    ]).then(([sources, topics, postsData]) => {
      const recentPosts = postsData.posts.slice(0, 8);
      const published = postsData.posts.filter((p) => p.status === 'published').length;
      const pending = postsData.posts.filter((p) => p.status === 'pending').length;
      const failed = postsData.posts.filter((p) => p.status === 'failed').length;
      setStats({
        sources: sources.length,
        topics: topics.length,
        posts: { total: postsData.posts.length, published, pending, failed },
      });
      setPosts(recentPosts);
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { icon: Rss, label: 'Источников RSS', value: stats.sources, to: '/sources', color: 'text-blue-400' },
        { icon: FileText, label: 'Активных тем', value: stats.topics, to: '/topics', color: 'text-purple-400' },
        { icon: CheckCircle, label: 'Опубликовано', value: stats.posts.published, to: '/posts', color: 'text-accent' },
        { icon: Clock, label: 'Ожидают публикации', value: stats.posts.pending, to: '/posts', color: 'text-yellow-400' },
      ]
    : [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Дашборд</h1>
        <p className="text-sm text-muted mt-1">Обзор работы контент-фабрики</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : statCards.map(({ icon: Icon, label, value, to, color }) => (
              <Link key={label} to={to}>
                <Card hover className="h-28 flex flex-col justify-between">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div>
                    <div className="text-2xl font-semibold text-white font-mono">{value}</div>
                    <div className="text-xs text-muted mt-0.5">{label}</div>
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-dim uppercase tracking-wide">Последние посты</h2>
          <Link to="/posts" className="flex items-center gap-1 text-xs text-accent hover:text-green-400 transition-colors">
            Все посты <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          {loading ? (
            <div className="divide-y divide-white/[0.05]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="w-16 h-5" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-24 h-4" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center">
              <Newspaper className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">Постов пока нет</p>
              <p className="text-xs text-muted/60 mt-1">Добавьте источник и тему чтобы начать</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {posts.map((post) => {
                const s = statusMap[post.status];
                return (
                  <div key={post.id} className="p-4 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{post.sourceTitle}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{post.generatedText}</p>
                    </div>
                    <span className="text-xs text-muted/60 flex-shrink-0">
                      {new Date(post.createdAt).toLocaleDateString('ru')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
