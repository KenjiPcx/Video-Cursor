import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { EditorNodeType } from '../editor-graph';
import { Edge } from '@xyflow/react';
import {
    populateTimelineFromGraph,
    formatDuration,
    timeToPixels,
    pixelsToTime,
    TimelineItem,
    TimelineTrack,
    TimelineData
} from './timeline-utils';
import { Video, Image, Lightbulb, Clock, Volume2, VolumeX, Lock, Unlock, Play, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { TimelinePreviewModal } from '../timeline-preview-modal';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface TimelinePanelProps {
    showTimeline: boolean;
    nodes: EditorNodeType[];
    edges: Edge[];
    projectData?: {
        timelineData?: TimelineData;
    } | null;
    projectId: Id<"projects">;
}

// Drag state management hook
function useDragState() {
    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        draggedItemId: string | null;
        draggedTrackId: string | null;
        dragOffset: { x: number; y: number };
        currentPosition: { x: number; y: number };
        startPosition: { x: number; y: number };
        originalStartTime: number;
    } | null>(null);

    const startDrag = useCallback((
        itemId: string,
        trackId: string,
        mouseX: number,
        mouseY: number,
        elementX: number,
        originalStartTime: number
    ) => {
        const dragOffset = {
            x: mouseX - elementX,
            y: mouseY
        };

        setDragState({
            isDragging: true,
            draggedItemId: itemId,
            draggedTrackId: trackId,
            dragOffset,
            currentPosition: { x: mouseX, y: mouseY },
            startPosition: { x: elementX, y: mouseY },
            originalStartTime
        });
    }, []);

    const updateDrag = useCallback((mouseX: number, mouseY: number) => {
        if (dragState?.isDragging) {
            setDragState(prev => prev ? {
                ...prev,
                currentPosition: { x: mouseX, y: mouseY }
            } : null);
        }
    }, [dragState?.isDragging]);

    const endDrag = useCallback(() => {
        setDragState(null);
    }, []);

    return {
        dragState,
        startDrag,
        updateDrag,
        endDrag
    };
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
    timelineScale,
    trackType,
    dragState,
    onDragStart,
    onDragEnd,
    allItems,
    isMainTrack
}: {
    item: TimelineItem;
    timelineScale: number;
    trackType: string;
    dragState: any;
    onDragStart: (itemId: string, trackId: string, mouseX: number, mouseY: number, elementX: number, originalStartTime: number) => void;
    onDragEnd: (itemId: string, newStartTime: number, trackId: string) => void;
    allItems: TimelineItem[];
    isMainTrack: boolean;
}) {
    const isDragging = dragState?.isDragging && dragState.draggedItemId === item.id;
    const duration = item.endTime - item.startTime;

    // Calculate position - either dragged position or original position
    let leftPixels = timeToPixels(item.startTime, timelineScale);
    let startTime = item.startTime;

    if (isDragging && dragState) {
        const newX = dragState.currentPosition.x - dragState.dragOffset.x;
        const newStartTime = Math.max(0, pixelsToTime(newX, timelineScale));

        if (isMainTrack) {
            // Auto-snap logic for main track
            const snapThreshold = 0.5; // 500ms snap threshold
            const otherItems = allItems.filter(i => i.id !== item.id && i.trackId === item.trackId);

            let snappedTime = newStartTime;

            // Snap to start/end of other clips
            for (const otherItem of otherItems) {
                const distanceToStart = Math.abs(newStartTime - otherItem.startTime);
                const distanceToEnd = Math.abs(newStartTime - otherItem.endTime);
                const distanceFromMyEnd = Math.abs((newStartTime + duration) - otherItem.startTime);

                if (distanceToStart < snapThreshold) {
                    snappedTime = otherItem.startTime;
                    break;
                } else if (distanceToEnd < snapThreshold) {
                    snappedTime = otherItem.endTime;
                    break;
                } else if (distanceFromMyEnd < snapThreshold) {
                    snappedTime = otherItem.startTime - duration;
                    break;
                }
            }

            // Snap to timeline grid (every 1 second)
            const gridSnapThreshold = 0.25;
            const gridTime = Math.round(snappedTime);
            if (Math.abs(snappedTime - gridTime) < gridSnapThreshold) {
                snappedTime = gridTime;
            }

            startTime = Math.max(0, snappedTime);
        } else {
            // Free positioning for other tracks
            startTime = Math.max(0, newStartTime);
        }

        leftPixels = timeToPixels(startTime, timelineScale);
    }

    const widthPixels = timeToPixels(duration, timelineScale);
    const minWidth = Math.max(widthPixels, 60);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click

        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        onDragStart(
            item.id,
            item.trackId,
            e.clientX,
            e.clientY,
            rect.left,
            item.startTime
        );
    };

    const handleMouseUp = () => {
        if (isDragging) {
            onDragEnd(item.id, startTime, item.trackId);
        }
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mouseup', handleMouseUp);
            return () => document.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, startTime]);

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
        const baseColors = {
            video: 'bg-blue-600/90 border-blue-400',
            image: 'bg-purple-600/90 border-purple-400',
            audio: 'bg-green-600/90 border-green-400',
            draft: 'bg-orange-600/90 border-orange-400'
        };

        return baseColors[item.type] + (isDragging ? ' ring-2 ring-white/50' : '');
    };

    return (
        <div
            className={`
                absolute ${getBackgroundColor()}
                border rounded-sm h-12 
                flex items-center px-2
                hover:opacity-90 transition-all
                cursor-grab active:cursor-grabbing
                text-white text-xs
                overflow-hidden
                ${isDragging ? 'z-50 opacity-80 shadow-lg' : 'z-10'}
                select-none
            `}
            style={{
                left: `${leftPixels}px`,
                width: `${minWidth}px`,
                minWidth: '60px'
            }}
            title={`${item.name} (${formatDuration(duration)})\nStart: ${formatDuration(startTime)}`}
            onMouseDown={handleMouseDown}
        >
            {/* Snap indicator for main track */}
            {isDragging && isMainTrack && (
                <div className="absolute -top-6 left-0 right-0 h-1 bg-yellow-400 rounded opacity-80" />
            )}

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
    totalDuration,
    dragState,
    onDragStart,
    onDragEnd,
    allItems
}: {
    track: TimelineTrack;
    timelineScale: number;
    totalDuration: number;
    dragState: any;
    onDragStart: (itemId: string, trackId: string, mouseX: number, mouseY: number, elementX: number, originalStartTime: number) => void;
    onDragEnd: (itemId: string, newStartTime: number, trackId: string) => void;
    allItems: TimelineItem[];
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
    const isMainTrack = track.id === 'video-1';

    return (
        <div className="flex">
            {/* Track header */}
            <div className="w-32 min-w-32 bg-zinc-800 border-r border-zinc-600 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                    {getTrackIcon()}
                    <span className="text-xs font-medium">{track.name}</span>
                    {isMainTrack && (
                        <span className="text-xs text-yellow-400">(Auto-snap)</span>
                    )}
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
                        trackType={track.type}
                        dragState={dragState}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        allItems={allItems}
                        isMainTrack={isMainTrack}
                    />
                ))}

                {/* Empty track message */}
                {track.items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-zinc-500 text-xs">
                            {isMainTrack
                                ? "Drop video clips here - they'll auto-snap together"
                                : "Drop assets here for precise positioning"
                            }
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
    edges,
    projectData,
    projectId
}: TimelinePanelProps) {
    // State for preview modal
    const [showPreview, setShowPreview] = useState(false);

    // Drag state management
    const { dragState, startDrag, updateDrag, endDrag } = useDragState();

    // Mutations
    const syncGraphToTimeline = useMutation(api.timelineEditing.syncGraphToTimeline);
    const modifyTimelineAsset = useMutation(api.timelineEditing.modifyTimelineAsset);

    // Global mouse move handler for dragging
    useEffect(() => {
        if (dragState?.isDragging) {
            const handleMouseMove = (e: MouseEvent) => {
                updateDrag(e.clientX, e.clientY);
            };

            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [dragState?.isDragging, updateDrag]);

    // Handle drag end with backend update
    const handleDragEnd = useCallback(async (itemId: string, newStartTime: number, trackId: string) => {
        endDrag();

        // Don't update graph-prefixed items (they're temporary)
        if (itemId.startsWith('graph-')) {
            return;
        }

        try {
            const duration = timelineData.tracks
                .flatMap(t => t.items)
                .find(item => item.id === itemId)
                ?.endTime! - timelineData.tracks
                    .flatMap(t => t.items)
                    .find(item => item.id === itemId)
                    ?.startTime!;

            await modifyTimelineAsset({
                projectId,
                timelineItemId: itemId,
                startTime: newStartTime,
                endTime: newStartTime + duration,
                moveToTrackId: trackId,
            });
        } catch (error) {
            console.error('Failed to update timeline item position:', error);
        }
    }, [endDrag, modifyTimelineAsset, projectId]);

    // Calculate graph-derived timeline data
    const graphTimelineData = useMemo(() => {
        return populateTimelineFromGraph(nodes, edges);
    }, [nodes, edges]);

    // Merge both graph-derived data and database data for display
    const timelineData = useMemo((): TimelineData => {
        // Start with default tracks
        const defaultTracks = [
            { id: 'video-1', type: 'video' as const, name: 'Video 1', items: [] },
            { id: 'audio-1', type: 'audio' as const, name: 'Audio 1', items: [] }
        ];

        // Get database timeline data
        const dbTimelineData = projectData?.timelineData;
        const dbTracks = dbTimelineData?.tracks || defaultTracks;

        // Merge database items with graph items for display
        const mergedTracks = dbTracks.map(dbTrack => {
            const graphTrack = graphTimelineData.tracks.find(t => t.id === dbTrack.id);

            // Start with database items (AI-placed assets)
            const dbItems = dbTrack.items || [];

            // Add graph items that aren't already in database (identified by not having graph- prefix)
            const graphItems = graphTrack?.items.filter(graphItem =>
                !dbItems.some(dbItem =>
                    dbItem.id === `graph-${graphItem.id}` || dbItem.id === graphItem.id
                )
            ) || [];

            // Mark graph items with prefix for identification
            const markedGraphItems = graphItems.map(item => ({
                ...item,
                id: `graph-${item.id}`,
            }));

            return {
                ...dbTrack,
                items: [...dbItems, ...markedGraphItems].sort((a, b) => a.startTime - b.startTime)
            };
        });

        // Calculate total duration
        const maxDuration = Math.max(
            dbTimelineData?.duration || 0,
            graphTimelineData.duration,
            ...mergedTracks.flatMap(track => track.items.map(item => item.endTime))
        );

        return {
            tracks: mergedTracks,
            duration: maxDuration,
            timelineScale: dbTimelineData?.timelineScale || graphTimelineData.timelineScale || 50,
            compositionFilters: dbTimelineData?.compositionFilters
        };
    }, [projectData, graphTimelineData]);

    // Get all items for snap calculations
    const allItems = useMemo(() => {
        return timelineData.tracks.flatMap(track => track.items);
    }, [timelineData]);

    const handleSyncGraphToTimeline = () => {
        const hasGraphItems = graphTimelineData.tracks.some(track => track.items.length > 0);

        if (hasGraphItems) {
            syncGraphToTimeline({
                projectId,
                graphTimelineData
            }).catch(err => {
                console.error('Failed to sync graph timeline data:', err);
            });
        }
    };

    const handlePreviewTimeline = () => {
        if (timelineData.tracks.every(t => t.items.length === 0)) {
            alert('No timeline items to preview. Connect some nodes to the timeline first!');
            return;
        }

        // Open the preview modal
        setShowPreview(true);
    };

    // Check if there are unsaved graph changes
    const hasUnsavedGraphChanges = useMemo(() => {
        const hasGraphItems = graphTimelineData.tracks.some(track => track.items.length > 0);
        if (!hasGraphItems) return false;

        // Check if any graph items are not yet saved to database
        return graphTimelineData.tracks.some(graphTrack => {
            const dbTrack = projectData?.timelineData?.tracks?.find(t => t.id === graphTrack.id);
            if (!dbTrack) return true; // Track doesn't exist in DB

            return graphTrack.items.some(graphItem => {
                // Check if this graph item exists in database
                return !dbTrack.items?.some(dbItem =>
                    dbItem.id === `graph-${graphItem.id}` || dbItem.id === graphItem.id
                );
            });
        });
    }, [graphTimelineData, projectData]);

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

                    {/* Sync button */}
                    {hasUnsavedGraphChanges && (
                        <Button
                            onClick={handleSyncGraphToTimeline}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            title="Save graph connections to timeline"
                        >
                            <Save className="h-4 w-4 mr-1" />
                            Save Graph
                        </Button>
                    )}

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
                            dragState={dragState}
                            onDragStart={startDrag}
                            onDragEnd={handleDragEnd}
                            allItems={allItems}
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
                projectData={projectData}
                projectId={projectId}
            />
        </div>
    );
} 