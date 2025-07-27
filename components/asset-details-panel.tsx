import React, { useRef, useEffect } from 'react';
import { X, Video, Image, Clock, FileText, Download, Maximize } from 'lucide-react';
import { Button } from './ui/button';

interface AssetDetailsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    assetData: {
        assetId: string;
        name: string;
        url: string;
        type: 'video' | 'image';
        metadata?: {
            duration?: number;
            width?: number;
            height?: number;
            mimeType?: string;
            size?: number;
        };
    };
}

export function AssetDetailsPanel({ isOpen, onClose, assetData }: AssetDetailsPanelProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Keyboard shortcuts for video playback
    useEffect(() => {
        if (!isOpen || assetData.type !== 'video') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!videoRef.current) return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (videoRef.current.paused) {
                        videoRef.current.play();
                    } else {
                        videoRef.current.pause();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                    break;
                case 'f':
                    e.preventDefault();
                    if (videoRef.current.requestFullscreen) {
                        videoRef.current.requestFullscreen();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, assetData.type]);

    if (!isOpen) return null;

    const formatDuration = (duration?: number) => {
        if (!duration) return 'Unknown';
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (size?: number) => {
        if (!size) return 'Unknown';
        const mb = size / (1024 * 1024);
        if (mb < 1) {
            const kb = size / 1024;
            return `${kb.toFixed(1)} KB`;
        }
        return `${mb.toFixed(2)} MB`;
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = assetData.url;
        link.download = assetData.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFullscreen = () => {
        if (videoRef.current && videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const isVideo = assetData.type === 'video';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-hidden ${isVideo ? 'max-w-4xl w-full' : 'max-w-2xl w-full'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        {isVideo ? (
                            <Video className="h-6 w-6 text-blue-600" />
                        ) : (
                            <Image className="h-6 w-6 text-purple-600" />
                        )}
                        <h2 className="text-xl font-semibold text-gray-900 truncate">
                            {assetData.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isVideo && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleFullscreen}
                                className="text-gray-500 hover:text-gray-700"
                                title="Fullscreen (F)"
                            >
                                <Maximize className="h-5 w-5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Preview */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                        <div className={`bg-gray-100 rounded-lg overflow-hidden ${isVideo ? 'bg-black' : ''
                            }`}>
                            {isVideo ? (
                                <video
                                    ref={videoRef}
                                    src={assetData.url}
                                    controls
                                    className="w-full max-h-96 object-contain"
                                    preload="metadata"
                                    style={{ maxHeight: isVideo ? '500px' : '256px' }}
                                />
                            ) : (
                                <img
                                    src={assetData.url}
                                    alt={assetData.name}
                                    className="w-full max-h-64 object-contain"
                                />
                            )}
                        </div>
                        {isVideo && (
                            <div className="text-sm text-gray-500 text-center space-y-1">
                                <p>Keyboard shortcuts: Space/K (play/pause), ← → (seek), F (fullscreen)</p>
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-medium text-gray-900">Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">Type:</span>
                                    <span className="text-gray-600">{assetData.metadata?.mimeType || 'Unknown'}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Size:</span>
                                    <span className="text-gray-600">{formatFileSize(assetData.metadata?.size)}</span>
                                </div>

                                {assetData.metadata?.width && assetData.metadata?.height && (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">Dimensions:</span>
                                        <span className="text-gray-600">
                                            {assetData.metadata.width} × {assetData.metadata.height}px
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                {assetData.type === 'video' && assetData.metadata?.duration && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-gray-500" />
                                        <span className="font-medium">Duration:</span>
                                        <span className="text-gray-600">{formatDuration(assetData.metadata.duration)}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Asset ID:</span>
                                    <span className="text-gray-600 font-mono text-xs">{assetData.assetId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {isVideo ? 'Use keyboard shortcuts for easy video control' : 'Double-click nodes to view details'}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
} 