import React, { useMemo, useState } from 'react';
import { EditorNodeType } from '../editor-graph';
import { Edge } from '@xyflow/react';
import {
    populateTimelineFromGraph,
    formatDuration,
    timeToPixels,
    TimelineItem,
    TimelineTrack,
    TimelineData
} from './timeline-utils';
import { Video, Image, Lightbulb, Clock, Volume2, VolumeX, Lock, Unlock, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { TimelinePreviewModal } from '../timeline-preview-modal';

interface TimelinePanelProps {
    showTimeline: boolean;
    nodes: EditorNodeType[];
    edges: Edge[];
}

// Convert timeline data to format expected by Remotion composition
function convertToRemotionProps(timelineData: TimelineData) {
    return {
        timelineData: {
            tracks: timelineData.tracks.map(track => ({
                id: track.id,
                type: track.type,
                name: track.name,
                items: track.items.map(item => ({
                    id: item.id,
                    assetId: item.assetId,
                    type: item.type,
                    name: item.name,
                    url: item.url,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    assetStartTime: item.assetStartTime,
                    assetEndTime: item.assetEndTime,
                    trackId: item.trackId,
                    metadata: item.metadata,
                    volume: item.volume,
                    opacity: item.opacity,
                })),
                muted: track.muted,
                locked: track.locked,
            })),
            duration: timelineData.duration,
            timelineScale: timelineData.timelineScale,
        },
        backgroundColor: '#1a1a1a',
    };
}

function TimelineItemComponent({
    item,
    timelineScale
}: {
    item: TimelineItem;
    timelineScale: number;
}) {
    // Calculate position and width in pixels
    const leftPixels = timeToPixels(item.startTime, timelineScale);
    const widthPixels = timeToPixels(item.endTime - item.startTime, timelineScale);
    const minWidth = Math.max(widthPixels, 60); // Minimum 60px width for readability

    const getIcon = () => {
        switch (item.type) {
            case 'video':
                return <Video className="h-3 w-3" />;
            case 'image':
                return <Image className="h-3 w-3" />;
            case 'audio':
                return <Volume2 className="h-3 w-3" />;
            case 'draft':
                return <Lightbulb className="h-3 w-3" />;
        }
    };

    const getBackgroundColor = () => {
        switch (item.type) {
            case 'video':
                return 'bg-blue-600/90 border-blue-400';
            case 'image':
                return 'bg-purple-600/90 border-purple-400';
            case 'audio':
                return 'bg-green-600/90 border-green-400';
            case 'draft':
                return 'bg-orange-600/90 border-orange-400';
        }
    };

    const duration = item.endTime - item.startTime;

    return (
        <div
            className={`
                absolute ${getBackgroundColor()}
                border rounded-sm h-12 
                flex items-center px-2
                hover:opacity-90 transition-opacity
                cursor-pointer
                text-white text-xs
                overflow-hidden
            `}
            style={{
                left: `${leftPixels}px`,
                width: `${minWidth}px`,
                minWidth: '60px'
            }}
            title={`${item.name} (${formatDuration(duration)})\nStart: ${formatDuration(item.startTime)}`}
        >
            {/* Item content */}
            <div className="flex items-center gap-1 w-full overflow-hidden">
                {getIcon()}
                <span className="truncate font-medium">
                    {item.name}
                </span>
                <span className="ml-auto text-xs opacity-80">
                    {formatDuration(duration)}
                </span>
            </div>
        </div>
    );
}

function TimelineTrackComponent({
    track,
    timelineScale,
    totalDuration
}: {
    track: TimelineTrack;
    timelineScale: number;
    totalDuration: number;
}) {
    const getTrackColor = () => {
        switch (track.type) {
            case 'video':
                return 'bg-blue-900/20 border-blue-700/50';
            case 'audio':
                return 'bg-green-900/20 border-green-700/50';
        }
    };

    const getTrackIcon = () => {
        switch (track.type) {
            case 'video':
                return <Video className="h-4 w-4" />;
            case 'audio':
                return <Volume2 className="h-4 w-4" />;
        }
    };

    const trackWidth = timeToPixels(totalDuration, timelineScale);

    return (
        <div className="flex">
            {/* Track header */}
            <div className="w-32 min-w-32 bg-zinc-800 border-r border-zinc-600 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                    {getTrackIcon()}
                    <span className="text-xs font-medium">{track.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    {track.muted ? (
                        <VolumeX className="h-3 w-3 text-red-400" />
                    ) : (
                        <Volume2 className="h-3 w-3 text-zinc-500" />
                    )}
                    {track.locked ? (
                        <Lock className="h-3 w-3 text-orange-400" />
                    ) : (
                        <Unlock className="h-3 w-3 text-zinc-500" />
                    )}
                </div>
            </div>

            {/* Track timeline area */}
            <div
                className={`relative h-16 ${getTrackColor()} border-b border-zinc-600 flex-1`}
                style={{ minWidth: `${Math.max(trackWidth, 500)}px` }}
            >
                {track.items.map((item) => (
                    <TimelineItemComponent
                        key={item.id}
                        item={item}
                        timelineScale={timelineScale}
                    />
                ))}

                {/* Empty track message */}
                {track.items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-zinc-500 text-xs">
                            Drop assets here or connect nodes to timeline
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TimelineRuler({ duration, timelineScale }: { duration: number; timelineScale: number }) {
    const rulerWidth = timeToPixels(duration, timelineScale);
    const tickInterval = 5; // Tick every 5 seconds
    const ticks = [];

    for (let time = 0; time <= duration; time += tickInterval) {
        const position = timeToPixels(time, timelineScale);
        ticks.push(
            <div key={time} className="absolute flex flex-col items-center" style={{ left: `${position}px` }}>
                <div className="h-3 w-px bg-zinc-400"></div>
                <span className="text-xs text-zinc-400 mt-1">{formatDuration(time)}</span>
            </div>
        );
    }

    return (
        <div className="flex">
            {/* Ruler header space */}
            <div className="w-32 min-w-32 bg-zinc-900 border-r border-zinc-600 p-2">
                <span className="text-xs font-medium text-zinc-400">Timeline</span>
            </div>

            {/* Ruler */}
            <div
                className="relative h-8 bg-zinc-900 border-b border-zinc-600"
                style={{ minWidth: `${Math.max(rulerWidth, 500)}px` }}
            >
                {ticks}
            </div>
        </div>
    );
}

export function TimelinePanel({
    showTimeline,
    nodes,
    edges
}: TimelinePanelProps) {
    // State for preview modal
    const [showPreview, setShowPreview] = useState(false);

    // Calculate timeline data from connected nodes
    const timelineData = useMemo((): TimelineData => {
        return populateTimelineFromGraph(nodes, edges);
    }, [nodes, edges]);

    const handlePreviewTimeline = () => {
        if (timelineData.tracks.every(t => t.items.length === 0)) {
            alert('No timeline items to preview. Connect some nodes to the timeline first!');
            return;
        }

        // Open the preview modal
        setShowPreview(true);
    };

    if (!showTimeline) return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-zinc-900/98 border-t border-zinc-700 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-700 bg-zinc-800/80">
                <div className="text-white text-sm font-semibold">Multi-Track Timeline</div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-zinc-400 text-sm">
                        {timelineData.duration > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Duration: {formatDuration(timelineData.duration)}
                            </div>
                        )}
                        <div className="text-xs">
                            Scale: {timelineData.timelineScale}px/s
                        </div>
                    </div>

                    {/* Preview button */}
                    <Button
                        onClick={handlePreviewTimeline}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={timelineData.tracks.every(t => t.items.length === 0)}
                    >
                        <Play className="h-4 w-4 mr-1" />
                        Preview
                    </Button>
                </div>
            </div>

            {/* Timeline content */}
            <div className="h-full overflow-auto">
                {/* Time ruler */}
                <TimelineRuler
                    duration={Math.max(timelineData.duration, 30)} // Minimum 30s ruler
                    timelineScale={timelineData.timelineScale}
                />

                {/* Tracks */}
                <div>
                    {timelineData.tracks.map((track) => (
                        <TimelineTrackComponent
                            key={track.id}
                            track={track}
                            timelineScale={timelineData.timelineScale}
                            totalDuration={Math.max(timelineData.duration, 30)}
                        />
                    ))}
                </div>

                {/* Empty state */}
                {timelineData.tracks.every(t => t.items.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-zinc-500 text-center">
                            <div className="text-lg mb-2">Empty Timeline</div>
                            <div className="text-sm">
                                Connect nodes in the graph above to populate the timeline, or drag assets directly onto tracks
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline Preview Modal */}
            <TimelinePreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                nodes={nodes}
                edges={edges}
            />
        </div>
    );
} 