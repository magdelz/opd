import { useState, useEffect } from "react";
import { MessageCircle, X, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
  };
};

type MatchesPageProps = {
  onNavigate: (page: string) => void;
};

export function MatchesPage({ onNavigate }: MatchesPageProps) {
  const { user } = useAuth();
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

            const { data: userInterests } = await supabase
              .from("user_interests")
              .select("interest_id, interests(name)")
              .eq("user_id", otherUserId);

            return {
              id: match.id,
              status: match.status,
              user: {
                ...profile!,
                interests:
                  userInterests?.map((ui: any) => ui.interests.name) || [],
              },
            } as MatchWithUser;
          })
        );

        setMatches(matchesWithUsers);
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
    if (!error) loadMatches();
  };

  const handleReject = async (matchId: string) => {
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (!error) loadMatches();
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
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fadeUp {
          animation: fadeUp 0.5s ease-out forwards;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-10 text-center">
          Твои совпадения 💫
        </h1>

        {loading ? (
          <div className="text-center py-20 text-slate-500 text-lg">
            Загрузка...
          </div>
        ) : (
          <>
            {pendingMatches.length > 0 && (
              <Section
                title="Запросы на знакомство"
                color="emerald"
                users={pendingMatches}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}

            {acceptedMatches.length > 0 && (
              <Section
                title="Твои друзья"
                color="blue"
                users={acceptedMatches}
                onMessage={handleMessage}
              />
            )}

            {matches.length === 0 && (
              <div className="text-center mt-16">
                <p className="text-slate-600 text-lg mb-3">
                  Пока совпадений нет 😔
                </p>
                <button
                  onClick={() => onNavigate("search")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Начать поиск
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  users,
  onAccept,
  onReject,
  onMessage,
}: any) {
  return (
    <div className="mb-14 fadeUp">
      <h2
        className={`text-2xl font-semibold mb-6 text-${color}-700 text-center`}
      >
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map((m: any, i: number) => (
          <Card
            key={m.id}
            data={m}
            color={color}
            onAccept={onAccept}
            onReject={onReject}
            onMessage={onMessage}
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Card({ data, color, onAccept, onReject, onMessage }: any) {
  const Initial = data.user.full_name?.charAt(0).toUpperCase() || "U";

  return (
    <div
      className="fadeUp bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all transform hover:-translate-y-2 overflow-hidden p-6 border border-slate-100"
    >
      {/* аватар */}
      <div className="flex justify-center mb-5">
        <div
          className={`h-20 w-20 rounded-full bg-gradient-to-tr from-${color}-500 to-${color}-400 text-white flex items-center justify-center text-3xl font-bold shadow-md`}
        >
          {Initial}
        </div>
      </div>

      {/* имя + инфо */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900">
          {data.user.full_name}
          {data.user.age && (
            <span className="text-slate-500 text-lg font-medium">
              , {data.user.age}
            </span>
          )}
        </h3>
        {data.user.university && (
          <p className="text-slate-600 mt-1 text-sm">
            {data.user.university}
          </p>
        )}
        {data.user.dormitory && (
          <p className="text-slate-600 text-sm">{data.user.dormitory}</p>
        )}
      </div>

      {/* био */}
      {data.user.bio && (
        <p className="text-center text-slate-700 mt-4 text-sm italic">
          “{data.user.bio}”
        </p>
      )}

      {/* интересы */}
      {data.user.interests.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {data.user.interests.slice(0, 4).map((interest: string, i: number) => (
            <span
              key={i}
              className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full border border-slate-200"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* кнопки */}
      <div className="mt-6 flex justify-center gap-3">
        {onAccept && (
          <button
            onClick={() => onAccept(data.id)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all"
          >
            <Check className="w-4 h-4" />
            Принять
          </button>
        )}
        {onReject && (
          <button
            onClick={() => onReject(data.id)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        )}
        {onMessage && (
          <button
            onClick={() => onMessage(data.user.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Написать
          </button>
        )}
      </div>
    </div>
  );
}
