// Date, string and formatting helpers

export function formatTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatMessageDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  if (isToday) {
    return 'Today';
  }
  if (isYesterday) {
    return 'Yesterday';
  }

  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function formatLastSeen(lastSeen: any, online?: boolean): string {
  if (online) return 'Active now';
  if (!lastSeen) return 'Offline';

  const date = lastSeen?.toDate ? lastSeen.toDate() : new Date(lastSeen);
  if (isNaN(date.getTime())) return 'Offline';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Active just now';
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Generate consistent avatar color based on name/username
export function getAvatarColor(str: string): string {
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Generate deterministic conversation ID for two users so duplicates are mathematically impossible
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}
