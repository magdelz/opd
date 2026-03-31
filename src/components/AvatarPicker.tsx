import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Smile, Upload, Loader2 } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Avatar } from './Avatar';

const PRESET_AVATARS = [
  '👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🔬', '👩‍🎨', '🧑‍🚀',
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐻',
  '🌟', '🔥', '💎', '🎯', '🎮', '🎸',
  '🏀', '⚽', '🎾', '🏋️', '🧗', '🚴',
];

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-yellow-500 to-amber-500',
  'from-cyan-500 to-blue-500',
];

type AvatarPickerProps = {
  currentAvatar: string | null;
  onSelect: (avatar: string) => void;
  onClose: () => void;
};

export function AvatarPicker({ currentAvatar, onSelect, onClose }: AvatarPickerProps) {
  const { t } = useLang();
  
  const isImage = currentAvatar && (currentAvatar.startsWith('http') || currentAvatar.startsWith('blob:'));
  const parsed = parseAvatar(currentAvatar);
  
  const [activeTab, setActiveTab] = useState<'emoji' | 'photo'>(isImage ? 'photo' : 'emoji');
  const [selectedEmoji, setSelectedEmoji] = useState(isImage ? '' : parsed.emoji);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS.indexOf(parsed.colorClass) !== -1 ? AVATAR_COLORS.indexOf(parsed.colorClass) : 0);
  
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(isImage ? currentAvatar : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (activeTab === 'emoji') {
       onSelect(`${selectedEmoji}|${selectedColor}`);
    } else if (activeTab === 'photo' && previewUrl) {
       onSelect(previewUrl);
    }
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой! Максимальный размер 5 МБ.');
      return;
    }

    try {
      setUploading(true);
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error('Не авторизован');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setPreviewUrl(data.publicUrl);

    } catch (err) {
      console.error('Upload Error:', err);
      alert('Ошибка при загрузке фото');
    } finally {
      setUploading(false);
    }
  };

  const currentPreviewData = activeTab === 'photo' 
    ? previewUrl
    : `${selectedEmoji}|${selectedColor}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900">{t('profile.change_avatar')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'emoji' ? 'border-b-2 border-blue-500 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smile className="w-4 h-4" /> Эмодзи
          </button>
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'photo' ? 'border-b-2 border-blue-500 text-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Фотография
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 p-5 space-y-6">
          {/* Universal Preview */}
          <div className="flex justify-center">
             <Avatar 
               url={currentPreviewData} 
               size="xl" 
               className="shadow-xl ring-4 ring-white" 
             />
          </div>

          {activeTab === 'emoji' ? (
            <div className="space-y-6">
              {/* Color picker */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-3 text-center">Цвет фона</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {AVATAR_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(i)}
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${color} transition-all ${
                        selectedColor === i ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 shadow-md' : 'hover:scale-105 shadow-sm'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Emoji grid */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-3 text-center">Выбери иконку</p>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-12 flex items-center justify-center text-2xl rounded-xl transition-all ${
                        selectedEmoji === emoji
                          ? 'bg-blue-100 ring-2 ring-blue-400 scale-110 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {uploading ? (
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {uploading ? 'Загрузка...' : 'Нажмите, чтобы загрузить с устройства'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">До 5 МБ (JPG, PNG, WEBP)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions flex-shrink-0 to pin to bottom */}
        <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all font-medium shadow-md"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse avatar string "emoji|colorIndex" and return components.
 */
export function parseAvatar(avatarUrl: string | null | undefined): { emoji: string; colorClass: string } {
  if (!avatarUrl || !avatarUrl.includes('|')) {
    return { emoji: '', colorClass: AVATAR_COLORS[0] };
  }
  const [emoji, colorIdx] = avatarUrl.split('|');
  const idx = parseInt(colorIdx) || 0;
  return { emoji, colorClass: AVATAR_COLORS[idx] || AVATAR_COLORS[0] };
}

export { AVATAR_COLORS };
