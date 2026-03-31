-- Update RLS to allow authenticated users to insert new custom interests from the frontend
DROP POLICY IF EXISTS "Users can insert custom interests" ON interests;

CREATE POLICY "Users can insert custom interests"
  ON interests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed additional common interests for a richer experience
INSERT INTO interests (name, category, icon)
SELECT v.name, v.category, v.icon
FROM (VALUES
    ('Баскетбол', 'sport', '🏀'),
    ('Плавание', 'sport', '🏊‍♂️'),
    ('Теннис', 'sport', '🎾'),
    ('Йога', 'sport', '🧘‍♀️'),
    ('Пилатес', 'sport', '🧘‍♀️'),
    ('Кроссфит', 'sport', '🏋️'),
    ('Легкая атлетика', 'sport', '🏃‍♂️'),
    ('Бокс', 'sport', '🥊'),
    ('Единоборства', 'sport', '🥋'),
    ('Лыжи', 'sport', '🎿'),
    ('Сноуборд', 'sport', '🏂'),
    ('Велоспорт', 'sport', '🚵‍♂️'),
    ('Шахматы', 'sport', '♟️'),
    ('Скейтбординг', 'sport', '🛹'),
    
    ('Minecraft', 'games', '🎮'),
    ('Valorant', 'games', '🔫'),
    ('League of Legends', 'games', '🏰'),
    ('Genshin Impact', 'games', '🌟'),
    ('Apex Legends', 'games', '🚀'),
    ('Overwatch', 'games', '🎯'),
    ('World of Warcraft', 'games', '🗡️'),
    ('Hearthstone', 'games', '🎴'),
    ('The Sims', 'games', '🏠'),
    ('Настольные ролевые игры (D&D)', 'games', '🎲'),
    ('Мобильные игры', 'games', '📱'),

    ('Математика', 'study', '🔢'),
    ('Физика', 'study', '⚛️'),
    ('История', 'study', '📜'),
    ('Литература', 'study', '📚'),
    ('Китайский язык', 'study', '🇨🇳'),
    ('Испанский язык', 'study', '🇪🇸'),
    ('Французский язык', 'study', '🇫🇷'),
    ('Медицина', 'study', '🩺'),
    ('Машинное обучение (AI)', 'study', '🤖'),
    ('Бэкенд разработка', 'study', '💻'),
    ('Фронтенд разработка', 'study', '🌐'),
    ('Дизайн интерфейсов (UI/UX)', 'study', '🎨'),
    ('Экономика', 'study', '📈'),
    ('Маркетинг', 'study', '📊'),

    ('Фотография', 'hobby', '📷'),
    ('Рисование', 'hobby', '🖌️'),
    ('Театр', 'hobby', '🎭'),
    ('Игра на гитаре', 'hobby', '🎸'),
    ('Игра на фортепиано', 'hobby', '🎹'),
    ('Вокал', 'hobby', '🎤'),
    ('Кулинария', 'hobby', '🍳'),
    ('Выпечка', 'hobby', '🧁'),
    ('Танцы', 'hobby', '💃'),
    ('Аниме', 'hobby', '🌸'),
    ('Манга и Комиксы', 'hobby', '📖'),
    ('Кинематограф', 'hobby', '🎬'),
    ('Автомобили', 'hobby', '🏎️'),
    ('Путешествия', 'hobby', '✈️'),
    ('Астрономия', 'hobby', '🔭'),
    ('Инвестиции', 'hobby', '💰'),
    ('Вязание', 'hobby', '🧶')
) AS v(name, category, icon)
WHERE NOT EXISTS (
    SELECT 1 FROM interests WHERE name = v.name
);
