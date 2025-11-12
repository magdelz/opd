export function formatMessageTime(date: string | Date): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) {
    return messageDate.toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  if (diffDays < 7) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[messageDate.getDay()];
  }

  return messageDate.toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short'
  });
}

export function formatLastSeen(date: string | Date): string {
  const lastSeenDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн назад`;

  return lastSeenDate.toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short'
  });
}

export function getDateSeparator(date: string | Date): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / 86400000);

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';

  return messageDate.toLocaleDateString('ru', {
    day: 'numeric',
    month: 'long',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function groupMessagesByDate(messages: Array<{ id: string; created_at: string; [key: string]: any }>) {
  const groups: Array<{ date: string; messages: typeof messages }> = [];

  messages.forEach((message) => {
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || !isSameDay(lastGroup.date, message.created_at)) {
      groups.push({
        date: message.created_at,
        messages: [message]
      });
    } else {
      lastGroup.messages.push(message);
    }
  });

  return groups;
}
