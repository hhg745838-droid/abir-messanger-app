import React from 'react';

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😎', '🥳', '😏'],
  },
  {
    name: 'Gestures & Hearts',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👊', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🔥', '✨', '💯', '🎉', '🚀'],
  },
  {
    name: 'Expressions',
    emojis: ['🤔', '🤫', '🤭', '🤐', '🤨', '😐', '😑', '😶', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢'],
  },
  {
    name: 'Objects & Symbols',
    emojis: ['💬', '👀', '💡', '🔔', '📌', '📎', '⚡', '☕', '🍕', '🍻', '🎈', '⭐', '🌈', '☀️', '🌙', '🎧', '📸', '🎮', '💻', '📱'],
  },
];

export const EmojiPicker: React.FC<Props> = ({ onSelect, onClose }) => {
  return (
    <div className="absolute bottom-16 left-2 z-40 w-72 md:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span>Quick Emojis</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block">
              {cat.name}
            </span>
            <div className="grid grid-cols-6 gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition transform hover:scale-115 active:scale-95 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
