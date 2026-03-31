import { Dumbbell, Gamepad2, BookOpen, Lightbulb, Coffee, CheckCircle } from "lucide-react";
import { useLang } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

type HomePageProps = { onNavigate: (page: string) => void };

export function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useLang();
  const { user } = useAuth();

  const features = [
    { title: "Найди партнёра для спорта", desc: "Бегай по утрам, играй в футбол или занимайся в зале с соседями", icon: <Dumbbell className="h-6 w-6" />, tone: "from-blue-50 to-white text-blue-700" },
    { title: "Играй с соседями", desc: "CS:GO, Dota 2, настольные игры — найди команду прямо в общаге", icon: <Gamepad2 className="h-6 w-6" />, tone: "from-emerald-50 to-white text-emerald-700" },
    { title: "Учись вместе", desc: "Готовься к экзаменам, делай проекты и изучай языки в компании", icon: <BookOpen className="h-6 w-6" />, tone: "from-indigo-50 to-white text-indigo-700" },
    { title: "Делай проекты", desc: "Программирование, дизайн, музыка — создавай с единомышленниками", icon: <Lightbulb className="h-6 w-6" />, tone: "from-orange-50 to-white text-orange-700" },
    { title: "Заводи новых друзей", desc: "Кино, кафе, прогулки — находи компанию для любого досуга", icon: <Coffee className="h-6 w-6" />, tone: "from-pink-50 to-white text-pink-700" },
    { title: "Создавай события", desc: "Организуй встречи, мероприятия и собирай свою компанию", icon: <CheckCircle className="h-6 w-6" />, tone: "from-amber-50 to-white text-amber-700" },
  ];

  const steps = [
    { step: "1", title: "Создай анкету", text: "Расскажи о себе и своём общежитии" },
    { step: "2", title: "Укажи интересы", text: "Выбери, чем любишь заниматься" },
    { step: "3", title: "Найди совпадения", text: "Смотри анкеты соседей с похожими интересами" },
    { step: "4", title: "Начни общаться", text: "Пиши, планируй встречи и дружи" },
  ];

  const stories = [
    { quote: "Нашёл соседа по гитаре — теперь репетируем вместе каждые выходные. Уже написали 3 песни!", badge: "А", author: "Алексей, 21", sub: "МГУ, общага №3" },
    { quote: "Бегаем по утрам с соседкой — супер заряд энергии! Уже пробежали первый полумарафон вместе.", badge: "М", author: "Мария, 19", sub: "МФТИ, общага №7" },
    { quote: "Собрали команду для CS:GO прямо по этажу! Теперь играем турниры и побеждаем.", badge: "Д", author: "Дмитрий, 20", sub: "ВШЭ, общага №1" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl animate-glow" />
        <div className="absolute top-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-300/20 blur-3xl animate-glow" style={{animationDelay: '1s'}} />
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-12 text-center animate-slide-up">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {t('home.title1')}
          <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 ml-0 sm:ml-4">
            {t('home.title2')}
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
          {t('home.subtitle')}
        </p>

        <div className="mt-10">
          <button
            onClick={() => onNavigate(user ? "search" : "register")}
            className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30 btn-glow"
          >
            {t('home.start')}
          </button>
        </div>

        <div className="mx-auto mt-20 h-px max-w-4xl bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((c, i) => (
            <div key={c.title} className="animate-slide-up" style={{ animationDelay: `${i * 80 + 100}ms` }}>
              <div className="rounded-3xl border border-slate-100 bg-white/70 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:bg-white card-accent">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tone} shadow-inner`}>
                  {c.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{c.title}</h3>
                <p className="text-slate-600 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 bg-white/50 rounded-[3rem] shadow-sm border border-slate-100 mt-10 mb-20 backdrop-blur-sm">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-slate-900 mb-12">
          {t('home.how_it_works')}
        </h2>

        <div className="grid gap-8 md:grid-cols-4 relative">
          <div className="hidden md:block absolute top-12 left-20 right-20 h-0.5 bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-200 z-0"></div>
          {steps.map((s, i) => (
            <div key={s.step} className="animate-slide-up relative z-10" style={{ animationDelay: `${i * 100 + 100}ms` }}>
              <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-accent h-full">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xl font-bold mb-4 shadow-lg shadow-blue-500/30">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-slate-900 mb-12">
          {t('home.success_stories')}
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {stories.map((card, i) => (
            <div key={card.author} className="animate-slide-up" style={{ animationDelay: `${i * 100 + 200}ms` }}>
              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl card-accent h-full flex flex-col justify-between">
                <p className="text-slate-700 leading-relaxed italic text-lg mb-6">“{card.quote}”</p>
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 text-slate-700 font-bold text-lg shadow-sm">
                    {card.badge}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{card.author}</div>
                    <div className="text-sm text-slate-500 font-medium">{card.sub}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-16 rounded-t-[3rem]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-800/50 rounded-[2rem] p-8 md:p-12 border border-white/5 mb-12">
            <div className="flex flex-col md:flex-row justify-between gap-12">
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="text-blue-400">●</span> {t('home.about')}
                </h3>
                <p className="text-slate-400 leading-relaxed text-lg">
                  {t('home.about_text')}
                </p>
              </div>

              <div className="md:w-1/3">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="text-purple-400">●</span> {t('home.links')}
                </h3>
                <ul className="space-y-4">
                  <li><p className="text-lg text-slate-400 cursor-pointer hover:text-blue-400 transition-colors inline-block">{t('home.privacy')}</p></li>
                  <li><p className="text-lg text-slate-400 cursor-pointer hover:text-blue-400 transition-colors inline-block">{t('home.terms')}</p></li>
                  <li><p className="text-lg text-slate-400 cursor-pointer hover:text-blue-400 transition-colors inline-block">{t('home.support')}</p></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 font-medium">
            <p>&copy; 2026 {t('nav.brand')}. {t('home.rights')}</p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 cursor-pointer transition-colors grid place-items-center">TG</div>
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 cursor-pointer transition-colors grid place-items-center">VK</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
