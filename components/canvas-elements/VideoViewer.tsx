import React from "react";
import { Film, RefreshCw } from "lucide-react";
import { HistoryItem } from "../../types";

interface VideoViewerProps {
  item: HistoryItem;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoError: boolean;
  setVideoError: (err: boolean) => void;
  onRefresh?: (item: HistoryItem) => void;
  getThumbnailUrl: (url: string | undefined, type?: string) => string;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  item,
  videoRef,
  videoError,
  setVideoError,
  onRefresh,
  getThumbnailUrl,
}) => {
  return (
    <div id={`video-viewer-${item.id}`} className="w-full h-full relative overflow-hidden rounded-2xl bg-zinc-950">
      {videoError ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
            <Film className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-zinc-300">视频播放失败</p>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            可能是由于网络波动或媒体连接超时，请尝试重新加载。
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVideoError(false);
              if (onRefresh) onRefresh(item);
            }}
            className="px-4 py-1.5 bg-indigo-500 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-600 transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>重新加载</span>
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={item.videoUrl || undefined}
          poster={getThumbnailUrl(item.videoUrl, "video")}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => setVideoError(true)}
        />
      )}
    </div>
  );
};
