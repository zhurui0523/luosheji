import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Music, X, Download, Pause, Play } from "lucide-react";
import { cn } from "../../lib/utils";
import { HistoryItem } from "../../types";

interface AudioCardViewProps {
  item: HistoryItem;
  layoutMode?: "bento" | "free" | "semi_auto" | string;
  isDragDisabled?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  dockedItemId?: string | null;
  hasActiveParent?: boolean;
  hasChildren?: boolean;
  onSelect?: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload?: (item: HistoryItem) => void;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  isDraggingThisCard: boolean;
  localPos: { x: number; y: number };
}

export const AudioCardView: React.FC<AudioCardViewProps> = ({
  item,
  layoutMode,
  isDragDisabled,
  isSelected,
  isMultiSelected,
  dockedItemId,
  hasActiveParent,
  hasChildren,
  onSelect,
  onRemove,
  onDownload,
  handlePointerDown,
  isDraggingThisCard,
  localPos,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const cleanAudioName = (name: string | undefined) => {
    if (!name) return "音频素材";
    return name.replace(/\.(mp3|wav|m4a|ogg|aac|flac|wma)$/i, "");
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback failed", err);
      });
      setIsPlaying(true);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = clickPercent * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const waveformHeights = useMemo(() => {
    const heights: number[] = [];
    let hash = 0;
    const id = item.id;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < 30; i++) {
      const factor = Math.sin((i / 30) * Math.PI) * 0.7 + 0.3;
      const rnd = Math.abs(Math.sin(hash + i * 1.5)) * 0.5 + 0.5;
      const h = Math.max(15, Math.min(95, factor * rnd * 100));
      heights.push(h);
    }
    return heights;
  }, [item.id]);

  // Clean play/pause side effects when unmounting or item changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [item.videoUrl]);

  return (
    <motion.div
      id={`audio-card-${item.id}`}
      onPointerDown={handlePointerDown}
      initial={false}
      animate={{
        x: localPos.x,
        y: localPos.y,
        opacity: 1,
        scale: isDraggingThisCard ? 1.02 : 1,
      }}
      whileHover={{ scale: isDragDisabled ? 1 : 1.01, zIndex: 100 }}
      className={cn(
        "absolute w-[360px] h-[270px] group bg-white rounded-2xl p-6 shadow-2xl border-2 will-change-transform history-card-drag-area transition-[border-color,box-shadow,background-color] duration-200 touch-none",
        isMultiSelected || isSelected
          ? "border-indigo-600 ring-4 ring-indigo-500/25 shadow-indigo-500/15 shadow-xl"
          : "hover:shadow-indigo-500/10 border-gray-100/80"
      )}
      style={{ cursor: isDragDisabled ? "default" : "grab" }}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect(item.id);
      }}
      transition={isDraggingThisCard ? { type: "tween", duration: 0 } : {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
        opacity: { duration: 0.2 },
      }}
    >
      {layoutMode !== "bento" && layoutMode !== "semi_auto" && (isSelected || isMultiSelected || dockedItemId === item.id || hasActiveParent) && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-x-[15px] -translate-y-1/2 z-[50] flex items-center justify-center pointer-events-none transition-all duration-300",
            dockedItemId === item.id ? "scale-140" : "scale-100"
          )}
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 bg-zinc-950 border-indigo-500/40 group-hover:border-indigo-500/70 transition-all duration-300">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/40 transition-all duration-350" />
            <div className="absolute w-2 h-2 rounded-full bg-indigo-500/80" />
          </div>
        </div>
      )}

      {layoutMode !== "bento" && layoutMode !== "semi_auto" && (isSelected || isMultiSelected || dockedItemId === item.id || hasChildren) && (
        <div
          className={cn(
            "absolute right-0 top-1/2 translate-x-[15px] -translate-y-1/2 z-[50] flex items-center justify-center pointer-events-none transition-all duration-300",
            dockedItemId === item.id ? "scale-140" : "scale-100"
          )}
        >
          <div className={cn(
            "relative flex items-center justify-center w-8 h-8 rounded-full border-2 bg-zinc-950 transition-all duration-300",
            dockedItemId === item.id
              ? "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)] scale-110"
              : "border-indigo-500/40 group-hover:border-indigo-500/70"
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-350",
              dockedItemId === item.id ? "bg-indigo-400 animate-ping" : "bg-indigo-500/40"
            )} />
            <div className={cn(
              "absolute w-2 h-2 rounded-full",
              dockedItemId === item.id ? "bg-indigo-400" : "bg-indigo-500/80"
            )} />
          </div>

          {dockedItemId === item.id && (
            <div className="absolute right-[38px] bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-white whitespace-nowrap px-2.5 py-1 rounded-xl shadow-xl pointer-events-none animate-pulse">
              松开鼠标 添加为生成参考 ⚓
            </div>
          )}
        </div>
      )}

      {item.videoUrl && (
        <audio
          ref={audioRef}
          src={item.videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute top-5 right-5 p-1 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all border border-gray-100 opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
        title="删除音频素材"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center space-x-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
        <div className="w-8 h-8 rounded-xl bg-indigo-5 flex items-center justify-center text-indigo-600 border border-indigo-100/30 shadow-sm">
          <Music className="w-4 h-4" />
        </div>
        <span className="text-[14px] font-black text-zinc-800 tracking-wide font-sans truncate pr-8">
          {cleanAudioName(item.config?.originalName || item.config?.title)}
        </span>
      </div>

      <div className="relative w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 shadow-inner flex flex-col space-y-4">
        {onDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(item);
            }}
            className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full transition-all border border-zinc-700/40 active:scale-95 z-20 cursor-pointer"
            title="下载音频"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <div 
          className="flex items-end justify-between h-20 w-full px-1 pt-6 relative group/waveform hover:opacity-100 opacity-95 transition-opacity cursor-pointer" 
          onClick={handleWaveformClick}
        >
          {waveformHeights.map((height, i) => {
            const barPercent = (i / waveformHeights.length) * 100;
            const currentPercent = (currentTime / (duration || 1)) * 100;
            const isPlayed = barPercent <= currentPercent;
            return (
              <div
                key={i}
                className={cn(
                  "w-[2.5px] rounded-full transition-all duration-150",
                  isPlayed ? "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-zinc-700"
                )}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] font-bold text-zinc-400 font-mono select-none">
            {formatTime(currentTime)} / {formatTime(duration || 4)}
          </div>

          <div className="flex justify-center pr-2">
            <button
              onClick={togglePlay}
              className="p-2.5 bg-zinc-800 hover:bg-indigo-600 hover:scale-105 active:scale-95 text-white rounded-full transition-all duration-200 border border-zinc-700/40 shadow-md flex items-center justify-center cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white translate-x-[0.5px]" />
              )}
            </button>
          </div>
          
          <div className="w-10" />
        </div>
      </div>
    </motion.div>
  );
};
