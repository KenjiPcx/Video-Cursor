import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Music, Clock, Info, Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Global audio state management
let currentlyPlayingAudio: string | null = null;
const audioInstances = new Map<string, HTMLAudioElement>();

export interface AudioAssetNode extends Node {
    type: 'audioAsset';
    data: {
        assetId: string;
        name: string;
        url: string;
        onDetailsClick?: () => void;
        metadata?: {
            duration?: number;
            mimeType?: string;
            size?: number;
            bitrate?: number;
            sampleRate?: number;
            channels?: number;
        };
    };
}

export default function AudioAssetNode({ data }: { data: AudioAssetNode['data'] }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Register/unregister audio instance
    useEffect(() => {
        const audioId = data.assetId;

        if (audioRef.current) {
            audioInstances.set(audioId, audioRef.current);
        }

        return () => {
            audioInstances.delete(audioId);
            if (currentlyPlayingAudio === audioId) {
                currentlyPlayingAudio = null;
            }
        };
    }, [data.assetId]);

    const formatDuration = (duration?: number) => {
        if (!duration) return '0:00';
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (size?: number) => {
        if (!size) return 'Unknown';
        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)}KB`;
        }
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    };

    const formatBitrate = (bitrate?: number) => {
        if (!bitrate) return '';
        return `${Math.round(bitrate / 1000)}kbps`;
    };

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (currentlyPlayingAudio === data.assetId) {
                currentlyPlayingAudio = null;
            }
        } else {
            // Pause any other playing audio
            if (currentlyPlayingAudio && currentlyPlayingAudio !== data.assetId) {
                const otherAudio = audioInstances.get(currentlyPlayingAudio);
                if (otherAudio) {
                    otherAudio.pause();
                }
            }

            audioRef.current.play();
            setIsPlaying(true);
            currentlyPlayingAudio = data.assetId;
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (currentlyPlayingAudio === data.assetId) {
            currentlyPlayingAudio = null;
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    // Listen for other audio starting to pause this one
    useEffect(() => {
        const checkOtherAudio = () => {
            if (currentlyPlayingAudio !== data.assetId && isPlaying) {
                setIsPlaying(false);
                if (audioRef.current) {
                    audioRef.current.pause();
                }
            }
        };

        const interval = setInterval(checkOtherAudio, 100);
        return () => clearInterval(interval);
    }, [data.assetId, isPlaying]);

    const displayDuration = data.metadata?.duration ?? duration;

    return (
        <div
            className="audio-asset-node relative w-64 bg-gradient-to-br from-green-900 to-green-800 border-2 border-green-600 rounded-lg shadow-lg text-white overflow-hidden group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-green-500 border-2 border-green-300"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-green-500 border-2 border-green-300"
            />

            {/* Header */}
            <div className="p-3 bg-green-800 border-b border-green-600">
                <div className="flex items-center gap-2 mb-2">
                    <Music className="h-5 w-5 text-green-300 flex-shrink-0" />
                    <h3 className="font-semibold text-sm text-white truncate">
                        {data.name}
                    </h3>
                    {data.onDetailsClick && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                data.onDetailsClick?.();
                            }}
                            className="p-1 hover:bg-green-700 rounded text-green-300 hover:text-white transition-colors flex-shrink-0"
                            title="View details"
                        >
                            <Info className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-green-200 space-y-1">
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(displayDuration)}</span>
                    </div>
                    <div className="flex justify-between text-green-300">
                        <span>{formatFileSize(data.metadata?.size)}</span>
                        {data.metadata?.bitrate && (
                            <span>{formatBitrate(data.metadata.bitrate)}</span>
                        )}
                    </div>
                    {data.metadata?.sampleRate && (
                        <div className="text-green-300">
                            {data.metadata.sampleRate}Hz • {data.metadata.channels || 2} channels
                        </div>
                    )}
                </div>
            </div>

            {/* Audio Element */}
            <audio
                ref={audioRef}
                src={data.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                muted={isMuted}
                preload="metadata"
            />

            {/* Waveform Visualization Placeholder */}
            <div className="h-16 bg-green-900 relative overflow-hidden">
                {/* Simple waveform-like visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-end gap-1 h-8">
                        {Array.from({ length: 20 }, (_, i) => (
                            <div
                                key={i}
                                className="bg-green-400 w-1"
                                style={{
                                    height: `${Math.random() * 100 + 20}%`,
                                    opacity: currentTime > 0 && (i / 20) <= (currentTime / displayDuration) ? 1 : 0.3
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Play/Pause Button Overlay */}
                {showControls && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button
                            onClick={handlePlayPause}
                            className="w-12 h-12 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-105"
                        >
                            {isPlaying ? (
                                <Pause className="h-6 w-6" />
                            ) : (
                                <Play className="h-6 w-6 ml-0.5" />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            {showControls && (
                <div className="p-2 bg-green-800 border-t border-green-600 space-y-2">
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-300 w-10">
                            {formatDuration(currentTime)}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={displayDuration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-green-700 rounded-lg appearance-none slider-thumb"
                        />
                        <span className="text-green-300 w-10">
                            {formatDuration(displayDuration)}
                        </span>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            className="text-green-300 hover:text-white transition-colors"
                        >
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-green-700 rounded-lg appearance-none slider-thumb"
                        />
                    </div>
                </div>
            )}

            {/* Playing indicator */}
            {isPlaying && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Playing
                </div>
            )}
        </div>
    );
} 