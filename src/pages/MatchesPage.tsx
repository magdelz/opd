import { useState, useEffect } from "react";
import { MessageCircle, X, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";

import { Avatar } from "../components/Avatar";

type MatchWithUser = {
  id: string;
  status: string;
  user: {
    id: string;
    full_name: string;
    age: number | null;
    university: string | null;
    dormitory: string | null;
    bio: string | null;
    interests: string[];
    avatar_url: string | null;
  };
};

type MatchesPageProps = {
  onNavigate: (page: string) => void;
};

export function MatchesPage({ onNavigate }: MatchesPageProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const [matches, setMatches] = useState<MatchWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadMatches();
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (matchesData) {
        const matchesWithUsers = await Promise.all(
          matchesData.map(async (match) => {
            const otherUserId =
              match.user_id === user.id
                ? match.matched_user_id
                : match.user_id;

            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", otherUserId)
              .single();

            if (!profile) return null;

            const { data: userInterests } = await supabase
              .from("user_interests")
              .select("interest_id, interests(name)")
              .eq("user_id", otherUserId);

            return {
              id: match.id,
              status: match.status,
              user: {
                ...profile,
                interests:
                  userInterests?.map((ui: any) => ui.interests.name) || [],
              },
            } as MatchWithUser;
          })
        );

        setMatches(matchesWithUsers.filter(Boolean) as MatchWithUser[]);
      }
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (matchId: string) => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "accepted" })
      .eq("id", matchId);
    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'accepted' } : m));
    }
  };

  const handleReject = async (matchId: string) => {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (!error) {
      setMatches(prev => prev.filter(m => m.id !== matchId));
    }
  };

  const handleMessage = async (userId: string) => {
    if (!user) return;
    const pair = [user.id, userId].sort();

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${pair[0]},user2_id.eq.${pair[1]}),and(user1_id.eq.${pair[1]},user2_id.eq.${pair[0]})`
      )
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("conversations")
        .insert({ user1_id: pair[0], user2_id: pair[1] });
    }
    onNavigate("messages");
  };

  const pendingMatches = matches.filter((m) => m.status === "pending");
  const acceptedMatches = matches.filter((m) => m.status === "accepted");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-10 text-center text-gradient">
          {t('matches.title')}
        </h1>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-slate-500">{t('misc.loading')}</p>
          </div>
        ) : (
          <>
            {pendingMatches.length > 0 && (
              <Section
                title={t('matches.pending')}
                theme="emerald"
                users={pendingMatches}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}

            {acceptedMatches.length > 0 && (
              <Section
                title={t('matches.friends')}
                theme="blue"
                users={acceptedMatches}
                onMessage={handleMessage}
              />
            )}

            {matches.length === 0 && (
              <div className="text-center mt-16 bg-white p-12 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-600 text-lg mb-4">
                  {t('matches.empty')}
                </p>
                <button
                  onClick={() => onNavigate("search")}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md btn-glow"
                >
                  {t('matches.start_search')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function Section({ title, theme, users, onAccept, onReject, onMessage }: any) {
    const isEmerald = theme === 'emerald';
    return (
      <div className="mb-14 animate-slide-up">
        <h2 className={`text-2xl font-semibold mb-6 text-center ${isEmerald ? 'text-emerald-700' : 'text-blue-700'}`}>
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map((m: any, i: number) => (
            <Card
              key={m.id}
              data={m}
              theme={theme}
              onAccept={onAccept}
              onReject={onReject}
              onMessage={onMessage}
              delayMs={i * 100}
            />
          ))}
        </div>
      </div>
    );
  }

  function Card({ data, theme, onAccept, onReject, onMessage, delayMs }: any) {
    return (
      <div
        className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all transform hover:-translate-y-2 overflow-hidden p-6 border border-slate-100 card-accent"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <div className="flex justify-center mb-5">
          <Avatar url={data.user.avatar_url} altText={data.user.full_name} className="!w-20 !h-20 text-3xl shadow-md ring-4 ring-white" />
        </div>

        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900">
            {data.user.full_name}
            {data.user.age && <span className="text-slate-500 text-lg font-medium">, {data.user.age}</span>}
          </h3>
          {data.user.university && <p className="text-slate-600 mt-1 text-sm">{data.user.university}</p>}
          {data.user.dormitory && <p className="text-slate-600 text-sm">{data.user.dormitory}</p>}
        </div>

        {data.user.bio && (
          <p className="text-center text-slate-700 mt-4 text-sm italic line-clamp-2">
            “{data.user.bio}”
          </p>
        )}

        {data.user.interests.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {data.user.interests.slice(0, 4).map((interest: string, i: number) => (
              <span key={i} className="bg-slate-50 text-slate-600 text-xs px-3 py-1 rounded-full border border-slate-200">
                {interest}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          {onAccept && (
            <button
              onClick={() => onAccept(data.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all shadow-md"
            >
              <Check className="w-5 h-5 border-2 border-white rounded-full p-0.5" />
              {t('matches.accept')}
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(data.id)}
              className="p-2.5 rounded-xl border-2 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {onMessage && (
            <button
              onClick={() => onMessage(data.user.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-medium transition-all shadow-md"
            >
              <MessageCircle className="w-5 h-5" />
              {t('matches.write')}
            </button>
          )}
        </div>
      </div>
    );
  }
}
