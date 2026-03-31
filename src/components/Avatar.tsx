import { parseAvatar } from './AvatarPicker';

type AvatarProps = {
  url: string | null | undefined;
  altText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string; // Additional classes for ring, margins etc.
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-xl',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-16 h-16 text-3xl',
  xxl: 'h-24 w-24 md:h-28 md:w-28 text-4xl', // Custom huge size for Profile Page
};

export function Avatar({ url, altText, size = 'md', className = '' }: AvatarProps) {
  const isImage = url && (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:image'));
  
  if (isImage) {
    return (
      <img
        src={url as string}
        alt={altText || 'Avatar'}
        className={`rounded-full object-cover ${SIZE_CLASSES[size]} ${className}`}
        onError={(e) => {
          // Fallback if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  const avatar = parseAvatar(url);
  const initials = altText ? altText.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={`grid place-items-center rounded-full bg-gradient-to-tr ${avatar.colorClass} font-bold shadow-sm flex-shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className={avatar.emoji ? 'text-white drop-shadow-sm' : 'text-white'}>
        {avatar.emoji || initials}
      </span>
    </div>
  );
}
