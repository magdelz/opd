import React from "react";
import { Dumbbell, Gamepad2, BookOpen, Lightbulb, Coffee, CheckCircle } from "lucide-react";

type HomePageProps = { onNavigate: (page: string) => void };

export function HomePage({ onNavigate }: HomePageProps) {
  // данные для карточек и шагов
  const features = [
    { title: "Найди партнёра для спорта", desc: "Бегай по утрам, играй в футбол или занимайся в зале с соседями", icon: <Dumbbell className="h-6 w-6" />, tone: "from-blue-50 to-white text-blue-700" },
    { title: "Играй с соседями", desc: "CS:GO, Dota 2, настольные игры — найди команду прямо в общаге", icon: <Gamepad2 className="h-6 w-6" />, tone: "from-emerald-50 to-white text-emerald-700" },
    { title: "Учись вместе", desc: "Готовься к экзаменам, делай проекты и изучай языки в компании", icon: <BookOpen className="h-6 w-6" />, tone: "from-indigo-50 to-white text-indigo-700" },
    { title: "Делай проекты", desc: "Программирование, дизайн, музыка — создавай с единомышленниками", icon: <Lightbulb className="h-6 w-6" />, tone: "from-orange-50 to-white text-orange-700" },
    { title: "Заводи новых друзей", desc: "Кино, кафе, прогулки — находи компанию для любого досуга", icon: <Coffee className="h-6 w-6" />, tone: "from-pink-50 to-white text-pink-700" },
    { title: "Создавай события", desc: "Организуй встречи, мероприятия и собирай свою компанию", icon: <CheckCircle className="h-6 w-6" />, tone: "from-yellow-50 to-white text-yellow-700" },
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* локальные keyframes и классы анимаций — ничего устанавливать не надо */}
      <style>{`
        @keyframes fadeUp { from {opacity:0; transform: translateY(14px)} to {opacity:1; transform: translateY(0)} }
        @keyframes fade { from {opacity:0} to {opacity:1} }
        .animate-fade-up { animation: fadeUp .35s ease-out both; }
        .animate-fade { animation: fade .35s ease-out both; }
      `}</style>

      {/* Декор-«blobs» */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-12 text-center">
        <h1 className="animate-fade-up [animation-delay:0ms] text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Найди своего соседа
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            по интересам!
          </span>
        </h1>

        <p className="animate-fade-up [animation-delay:80ms] mt-5 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Играй, тренируйся, учись и отдыхай с теми, кто разделяет твои увлечения
        </p>

        <div className="animate-fade-up [animation-delay:160ms] mt-8">
          <button
            onClick={() => onNavigate("register")}
            className="group relative inline-flex items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-white text-lg font-semibold shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-600/30"
          >
            <span className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 blur transition-opacity duration-300 group-hover:opacity-30" />
            <span className="relative">Начать поиск</span>
          </button>
        </div>

        <div className="mx-auto mt-14 h-px max-w-7xl bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </section>

      {/* ПЛЮСЫ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((c, i) => (
            <div
              key={c.title}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-900/5 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-blue-200"
              >
                <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone}`}>
                  {c.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{c.title}</h3>
                <p className="mt-1 text-slate-600 text-sm leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* КАК ЭТО РАБОТАЕТ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="animate-fade-up [animation-delay:0ms] text-3xl font-bold text-center text-slate-900 mb-10">
          Как это работает
        </h2>

        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="relative rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm shadow-slate-900/5 transition-transform duration-200 hover:-translate-y-1">
                <div className="absolute -top-3 left-6 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white text-sm font-semibold shadow-md">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-slate-600 text-sm">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ИСТОРИИ УСПЕХА */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="animate-fade-up [animation-delay:0ms] text-3xl font-bold text-center text-slate-900 mb-8">
          Истории успеха
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {stories.map((card, i) => (
            <div key={card.author} className="animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <p className="text-slate-800 leading-relaxed italic">“{card.quote}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {card.badge}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{card.author}</div>
                    <div className="text-sm text-slate-600">{card.sub}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER (тексты прежние) */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">О нас</h3>
              <p className="text-slate-400">
                Платформа для студентов, которая помогает находить друзей и напарников по интересам прямо в общежитии.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Контакты</h3>
              <p className="text-slate-400">Email: info@sosedpointeresam.ru</p>
              <p className="text-slate-400">Telegram: @sosedi_support</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Ссылки</h3>
              <p className="text-slate-400 cursor-pointer hover:text-white">Политика конфиденциальности</p>
              <p className="text-slate-400 cursor-pointer hover:text-white">Правила использования</p>
              <p className="text-slate-400 cursor-pointer hover:text-white">Поддержка</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-slate-400">
            <p>&copy; 2025 Сосед по интересам. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

