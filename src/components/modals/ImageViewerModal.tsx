import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<Props> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
      {/* Top controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          download="chat-image.jpg"
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md"
          title="Open in new tab"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md cursor-pointer"
          title="Close image"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative max-w-5xl max-h-[88vh] flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Chat attachment"
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
        />
      </div>
    </div>
  );
};
