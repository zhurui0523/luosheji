import React from "react";
import { Loader2, ImageIcon, RefreshCw } from "lucide-react";
import { HistoryItem } from "../../types";

interface ImageViewerProps {
  item: HistoryItem;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  imageError: boolean;
  setImageError: (err: boolean) => void;
  onRefresh?: (item: HistoryItem) => void;
  getThumbnailUrl: (url: string | undefined) => string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  item,
  imageLoaded,
  setImageLoaded,
  imageError,
  setImageError,
  onRefresh,
  getThumbnailUrl,
}) => {
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div id={`image-viewer-${item.id}`} className="w-full h-full relative overflow-hidden rounded-2xl">
      {imageError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-zinc-300">图片加载失败</p>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            可能是由于网络波动或云端同步延迟，请尝试重新加载。
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageError(false);
              setImageLoaded(false);
              if (onRefresh) onRefresh(item);
            }}
            className="px-4 py-1.5 bg-indigo-500 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-600 transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>重新加载</span>
          </button>
        </div>
      ) : (
        <>
          {item.imageUrl ? (
            <img
              src={getThumbnailUrl(item.imageUrl)}
              alt="Generated"
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-200" />
            </div>
          )}
          {!imageLoaded && item.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-200" />
            </div>
          )}
        </>
      )}
    </div>
  );
};
