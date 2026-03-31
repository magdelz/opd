import { useState } from 'react';
import { useLang } from '../contexts/LanguageContext';

const STICKER_CATEGORIES = [
  {
    key: 'faces',
    labelKey: 'stickers.faces',
    stickers: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😎','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😈','👿','💀','👻','👽','🤖'],
  },
  {
    key: 'gestures',
    labelKey: 'stickers.gestures',
    stickers: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤏','💪','🦾','🖕','✍️'],
  },
  {
    key: 'hearts',
    labelKey: 'stickers.hearts',
    stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','😻','💑','💏'],
  },
  {
    key: 'animals',
    labelKey: 'stickers.animals',
    stickers: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅','🦆','🦉','🐝','🦋','🐌','🐛','🐞','🐜','🕷️','🐢','🐍','🦎','🐙','🦀','🐠','🐬','🐳','🦈','🐊','🦩','🦚'],
  },
  {
    key: 'food',
    labelKey: 'stickers.food',
    stickers: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍕','🍔','🍟','🌭','🌮','🌯','🥗','🍣','🍜','🍝','🍰','🎂','🍩','🍪','🍫','🍬','🧁','☕','🍵','🧃','🥤','🍺','🍷'],
  },
  {
    key: 'activities',
    labelKey: 'stickers.activities',
    stickers: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🏋️','🤸','⛷️','🏂','🏄','🚴','🧗','🤺','🏆','🎮','🎲','🎯','🎪','🎭','🎨','🎬','🎤','🎧','🎸','🎹','🎷','🥁','🎻'],
  },
];

type StickerPickerProps = {
  onSelect: (sticker: string) => void;
  onClose: () => void;
};

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-slide-up">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {STICKER_CATEGORIES.map((cat, i) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(i)}
            className={`flex-shrink-0 px-3 py-2 text-lg transition-colors ${
              activeTab === i
                ? 'bg-blue-50 border-b-2 border-blue-500'
                : 'hover:bg-slate-50'
            }`}
            title={t(cat.labelKey)}
          >
            {cat.stickers[0]}
          </button>
        ))}
        <button
          onClick={onClose}
          className="ml-auto flex-shrink-0 px-3 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        >
          ✕
        </button>
      </div>

      {/* Category label */}
      <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
        {t(STICKER_CATEGORIES[activeTab].labelKey)}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {STICKER_CATEGORIES[activeTab].stickers.map((sticker, i) => (
          <button
            key={i}
            onClick={() => { onSelect(sticker); onClose(); }}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-blue-50 hover:scale-110 transition-all duration-150"
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Check if a message is a single sticker (only emojis, no text).
 */
export function isStickerMessage(text: string): boolean {
  // Remove all emoji characters, see if anything remains
  const withoutEmoji = text.replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u20E3]/gu, '').trim();
  return withoutEmoji.length === 0 && text.trim().length > 0 && text.trim().length <= 12;
}
