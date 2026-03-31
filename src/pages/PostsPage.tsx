import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { filterContent } from '../lib/contentFilter';
import { Avatar } from '../components/Avatar';

type Post = {
  id: string;
  author_id: string;
  content: string;
  category: string;
  likes_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  liked_by_me: boolean;
  comments: PostComment[];
};

type PostComment = {
  id: string;
  author_id: string;
  content: string;
  author_name: string;
  created_at: string;
};

type PostsPageProps = {
  onNavigate: (page: string) => void;
};

export function PostsPage({ onNavigate }: PostsPageProps) {
  const { user, profile } = useAuth();
  const { t } = useLang();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [filterCat, setFilterCat] = useState('all');
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const categories = [
    { value: 'sport', label: t('cat.sport'), emoji: '🏀' },
    { value: 'games', label: t('cat.games'), emoji: '🎮' },
    { value: 'study', label: t('cat.study'), emoji: '📚' },
    { value: 'hobby', label: t('cat.hobby'), emoji: '🎨' },
    { value: 'other', label: t('cat.other'), emoji: '💬' },
  ];

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load posts with author info
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!postsData) { setLoading(false); return; }

      const enriched = await Promise.all(
        postsData.map(async (post: any) => {
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', post.author_id)
            .single();

          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();

          const { data: commentsData } = await supabase
            .from('post_comments')
            .select('*')
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

          const enrichedComments = await Promise.all(
            (commentsData || []).map(async (c: any) => {
              const { data: cAuthor } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', c.author_id)
                .single();
              return { ...c, author_name: cAuthor?.full_name || '?' };
            })
          );

          return {
            ...post,
            author_name: authorProfile?.full_name || '?',
            author_avatar: authorProfile?.avatar_url || null,
            liked_by_me: !!likeData,
            comments: enrichedComments,
          } as Post;
        })
      );

      setPosts(enriched);
    } catch (e) {
      console.error('Error loading posts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newContent.trim()) return;
    const { clean } = filterContent(newContent);

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      content: clean,
      category: newCategory,
    });
    if (!error) {
      setNewContent('');
      setShowCreate(false);
      loadPosts();
    }
  };

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      await supabase.from('posts').update({ likes_count: Math.max(0, (posts.find(p => p.id === postId)?.likes_count || 1) - 1) }).eq('id', postId);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      await supabase.from('posts').update({ likes_count: (posts.find(p => p.id === postId)?.likes_count || 0) + 1 }).eq('id', postId);
    }
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: !liked, likes_count: liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 } : p));
  };

  const handleComment = async (postId: string) => {
    if (!user) return;
    const text = (commentTexts[postId] || '').trim();
    if (!text) return;
    const { clean } = filterContent(text);

    const { error } = await supabase.from('post_comments').insert({
      post_id: postId,
      author_id: user.id,
      content: clean,
    });
    if (!error) {
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      // Optimistic add
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { id: Date.now().toString(), author_id: user.id, content: clean, author_name: profile?.full_name || '?', created_at: new Date().toISOString() }] }
          : p
      ));
    }
  };

  const filteredPosts = filterCat === 'all' ? posts : posts.filter(p => p.category === filterCat);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {t('posts.title')}
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md font-medium"
          >
            <Plus className="w-5 h-5" /> {t('posts.create')}
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              filterCat === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {t('posts.all')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilterCat(cat.value)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                filterCat === cat.value
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Create Post Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">{t('posts.create')}</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={t('posts.placeholder')}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none"
                />
                <div className="flex gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setNewCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        newCategory === cat.value
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                          : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={!newContent.trim()}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md disabled:opacity-50"
                >
                  {t('posts.publish')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts feed */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">{t('misc.loading')}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-slate-600 text-lg">{t('posts.no_posts')}</p>
            <p className="text-slate-400 mt-2">{t('posts.be_first')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post, idx) => {
              const catInfo = categories.find(c => c.value === post.category);
              const isExpanded = expandedComments.has(post.id);

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Post header */}
                  <div className="flex items-center gap-3 p-4 pb-0">
                    <Avatar url={post.author_avatar} altText={post.author_name} size="md" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{post.author_name}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(post.created_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {catInfo && <span className="ml-2">{catInfo.emoji} {catInfo.label}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Post content */}
                  <div className="px-4 py-3">
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>

                  {/* Like & comment bar */}
                  <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100">
                    <button
                      onClick={() => handleLike(post.id, post.liked_by_me)}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        post.liked_by_me ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked_by_me ? 'fill-red-500' : ''}`} />
                      {post.likes_count > 0 && post.likes_count}
                    </button>
                    <button
                      onClick={() => setExpandedComments(prev => {
                        const next = new Set(prev);
                        if (next.has(post.id)) next.delete(post.id);
                        else next.add(post.id);
                        return next;
                      })}
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.comments.length > 0 && post.comments.length}
                    </button>
                  </div>

                  {/* Comments */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="px-4 py-2 border-b border-slate-100 last:border-b-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-slate-700">{comment.author_name}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(comment.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                        </div>
                      ))}

                      {/* Add comment */}
                      <div className="flex gap-2 p-3">
                        <input
                          type="text"
                          value={commentTexts[post.id] || ''}
                          onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          placeholder={t('posts.comment_placeholder')}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!(commentTexts[post.id] || '').trim()}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
