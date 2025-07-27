import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Video, Clock, Info, Play, Pause } from 'lucide-react';

// Global video state management
let currentlyPlayingVideo: string | null = null;
const videoInstances = new Map<string, HTMLVideoElement>();

export interface VideoAssetNode extends Node {
    type: 'videoAsset';
    data: {
        assetId: string;
        name: string;
        url: string;
        onDetailsClick?: () => void;
        metadata?: {
            duration?: number;
            width?: number;
            height?: number;
            mimeType?: string;
            size?: number;
        };
    };
}

export default function VideoAssetNode({ data }: { data: VideoAssetNode['data'] }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Register/unregister video instance
    useEffect(() => {
        const videoId = data.assetId;

        if (videoRef.current) {
            videoInstances.set(videoId, videoRef.current);
        }

        return () => {
            videoInstances.delete(videoId);
            if (currentlyPlayingVideo === videoId) {
                currentlyPlayingVideo = null;
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
        if (!size) return '';
        const mb = size / (1024 * 1024);
        return `${mb.toFixed(1)}MB`;
    };

    const pauseOtherVideos = (currentVideoId: string) => {
        videoInstances.forEach((videoElement, videoId) => {
            if (videoId !== currentVideoId && !videoElement.paused) {
                videoElement.pause();
            }
        });
    };

    const handleVideoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            currentlyPlayingVideo = null;
        } else {
            // Pause other videos before playing this one
            pauseOtherVideos(data.assetId);

            videoRef.current.play().catch(console.error);
            setIsPlaying(true);
            currentlyPlayingVideo = data.assetId;
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (currentlyPlayingVideo === data.assetId) {
            currentlyPlayingVideo = null;
        }
    };

    const handleVideoPause = () => {
        setIsPlaying(false);
        if (currentlyPlayingVideo === data.assetId) {
            currentlyPlayingVideo = null;
        }
    };

    const handleVideoPlay = () => {
        setIsPlaying(true);
        currentlyPlayingVideo = data.assetId;
    };

    const handleDetailsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Video details clicked');
        if (data.onDetailsClick) {
            data.onDetailsClick();
        }
    };

    return (
        <div
            className="bg-blue-600 border-2 border-blue-500 rounded-lg shadow-lg w-[360px] h-[270px] overflow-hidden relative group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-blue-400 !border-blue-300 !w-3 !h-3"
            />

            {/* Video thumbnail/preview area */}
            <div className="bg-blue-700 h-48 flex items-center justify-center relative cursor-pointer">
                {data.url ? (
                    <>
                        <video
                            ref={videoRef}
                            src={data.url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                            onEnded={handleVideoEnded}
                            onPause={handleVideoPause}
                            onPlay={handleVideoPlay}
                            onClick={handleVideoClick}
                        />

                        {/* Play/Pause Overlay */}
                        <div
                            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                                }`}
                            onClick={handleVideoClick}
                        >
                            <div className="bg-black bg-opacity-50 rounded-full p-4 hover:bg-opacity-70 transition-all">
                                {isPlaying ? (
                                    <Pause className="h-8 w-8 text-white" />
                                ) : (
                                    <Play className="h-8 w-8 text-white ml-1" />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <Video className="h-16 w-16 text-blue-200" />
                )}

                {/* Details button */}
                <button
                    onClick={handleDetailsClick}
                    className="absolute top-2 right-2 bg-blue-800 hover:bg-blue-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="View details"
                >
                    <Info className="h-4 w-4 text-blue-200" />
                </button>

                {/* Playing indicator */}
                {isPlaying && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                        Playing
                    </div>
                )}
            </div>

            <div className="p-4 text-white space-y-2">
                <div className="text-base font-semibold truncate" title={data.name}>
                    {data.name}
                </div>

                <div className="flex items-center justify-between text-sm text-blue-100">
                    {data.metadata?.duration && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(data.metadata.duration)}</span>
                        </div>
                    )}

                    {data.metadata?.size && (
                        <span>{formatFileSize(data.metadata.size)}</span>
                    )}
                </div>

                {data.metadata?.width && data.metadata?.height && (
                    <div className="text-sm text-blue-200">
                        {data.metadata.width}×{data.metadata.height}px
                    </div>
                )}
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-blue-400 !border-blue-300 !w-3 !h-3"
            />
        </div>
    );
} 