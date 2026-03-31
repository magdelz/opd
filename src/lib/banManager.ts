// ======================== Ban Manager ========================
// Client-side ban list stored in localStorage.

const STORAGE_KEY = 'app_banned_users';

function getList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveList(list: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function banUser(userId: string) {
  const list = getList();
  if (!list.includes(userId)) {
    list.push(userId);
    saveList(list);
  }
}

export function unbanUser(userId: string) {
  const list = getList().filter(id => id !== userId);
  saveList(list);
}

export function isBanned(userId: string): boolean {
  return getList().includes(userId);
}

export function getBannedUsers(): string[] {
  return getList();
}

// ======================== Hidden Categories ========================
const HIDDEN_CATS_KEY = 'app_hidden_categories';

export function getHiddenCategories(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_CATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setHiddenCategories(cats: string[]) {
  try { localStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify(cats)); } catch {}
}

export function toggleHiddenCategory(cat: string) {
  const list = getHiddenCategories();
  if (list.includes(cat)) {
    setHiddenCategories(list.filter(c => c !== cat));
  } else {
    setHiddenCategories([...list, cat]);
  }
}

export function isCategoryHidden(cat: string): boolean {
  return getHiddenCategories().includes(cat);
}
