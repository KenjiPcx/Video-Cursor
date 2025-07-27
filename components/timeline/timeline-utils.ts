import { EditorNodeType } from '../editor-graph';
import { Edge } from '@xyflow/react';

export interface TimelineItem {
    id: string; // Unique timeline item ID
    assetId?: string; // Reference to original asset  
    type: 'video' | 'image' | 'audio' | 'draft';
    name: string;
    url?: string;

    // Absolute positioning on timeline (in seconds)
    startTime: number; // When item starts on timeline
    endTime: number;   // When item ends on timeline

    // Asset portion to use (for trimming/cropping)
    assetStartTime: number; // Start time within the source asset
    assetEndTime: number;   // End time within the source asset

    // Track assignment
    trackId: string;

    // Metadata
    metadata?: {
        width?: number;
        height?: number;
        size?: number;
        mimeType?: string;
        duration?: number; // Original asset duration
    };

    // Visual/audio properties
    volume?: number; // For audio (0-1)
    opacity?: number; // For video (0-1)
}

export interface TimelineTrack {
    id: string;
    type: 'video' | 'audio';
    name: string; // "Video 1", "Audio 1", etc.
    items: TimelineItem[];
    muted?: boolean;
    locked?: boolean;
}

export interface TimelineData {
    tracks: TimelineTrack[];
    duration: number; // Total timeline duration
    timelineScale: number; // Pixels per second for display
}

/**
 * Create default tracks for a new timeline
 */
export function createDefaultTracks(): TimelineTrack[] {
    return [
        {
            id: 'video-1',
            type: 'video',
            name: 'Video 1',
            items: [],
        },
        {
            id: 'video-2',
            type: 'video',
            name: 'Video 2',
            items: [],
        },
        {
            id: 'audio-1',
            type: 'audio',
            name: 'Audio 1',
            items: [],
        }
    ];
}

/**
 * Generate a unique ID for timeline items
 */
export function generateTimelineItemId(): string {
    return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a timeline item from a graph node (for initial population)
 */
export function createTimelineItemFromNode(
    node: EditorNodeType,
    trackId: string,
    startTime: number = 0
): TimelineItem | null {
    let duration = 0;
    let item: Partial<TimelineItem> = {
        id: generateTimelineItemId(),
        trackId,
        startTime,
        assetStartTime: 0,
        volume: 1,
        opacity: 1,
    };

    switch (node.type) {
        case 'videoAsset':
            duration = node.data.metadata?.duration || 10;
            item = {
                ...item,
                assetId: node.data.assetId,
                type: 'video',
                name: node.data.name,
                url: node.data.url,
                metadata: node.data.metadata,
            };
            break;

        case 'imageAsset':
            duration = 5; // Default 5s for images
            item = {
                ...item,
                assetId: node.data.assetId,
                type: 'image',
                name: node.data.name,
                url: node.data.url,
                metadata: node.data.metadata,
            };
            break;

        case 'draft':
            duration = node.data.estimatedDuration || 8;
            item = {
                ...item,
                type: 'draft',
                name: node.data.title,
            };
            break;

        default:
            return null;
    }

    return {
        ...item,
        endTime: startTime + duration,
        assetEndTime: duration,
    } as TimelineItem;
}

/**
 * Auto-populate timeline from connected graph nodes (as a starting point)
 * Places items sequentially on the first available track
 */
export function populateTimelineFromGraph(
    nodes: EditorNodeType[],
    edges: Edge[],
    existingTracks: TimelineTrack[] = createDefaultTracks()
): TimelineData {
    // Get sequence from graph traversal  
    const sequence = buildTimelineSequence(nodes, edges);
    const tracks = [...existingTracks];

    // Find the first video track for initial population
    const videoTrack = tracks.find(t => t.type === 'video');
    if (!videoTrack || sequence.length === 0) {
        return {
            tracks,
            duration: 0,
            timelineScale: 50, // 50 pixels per second default
        };
    }

    // Place items sequentially as a starting point (user can edit later)
    let currentTime = 0;
    const newItems: TimelineItem[] = [];

    for (const node of sequence) {
        const item = createTimelineItemFromNode(node, videoTrack.id, currentTime);
        if (item) {
            newItems.push(item);
            currentTime = item.endTime; // Sequential placement
        }
    }

    // Add items to the track
    const updatedVideoTrack = {
        ...videoTrack,
        items: [...videoTrack.items, ...newItems],
    };

    const updatedTracks = tracks.map(t =>
        t.id === videoTrack.id ? updatedVideoTrack : t
    );

    const totalDuration = Math.max(
        ...updatedTracks.flatMap(t => t.items.map(item => item.endTime)),
        0
    );

    return {
        tracks: updatedTracks,
        duration: totalDuration,
        timelineScale: 50,
    };
}

/**
 * Traverse the graph starting from starting node to build a sequential timeline
 * (Keep this for initial population from graph)
 */
export function buildTimelineSequence(
    nodes: EditorNodeType[],
    edges: Edge[]
): EditorNodeType[] {
    const startingNode = nodes.find(n => n.type === 'starting');
    if (!startingNode) return [];

    const sequence: EditorNodeType[] = [];
    const visited = new Set<string>();

    function traverse(currentNodeId: string) {
        if (visited.has(currentNodeId)) return;
        visited.add(currentNodeId);

        const currentNode = nodes.find(n => n.id === currentNodeId);
        if (!currentNode) return;

        // Add to sequence (skip starting node in final sequence)
        if (currentNode.type !== 'starting') {
            sequence.push(currentNode);
        }

        // Find outgoing edges and continue traversal
        const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

        // For now, just take the first outgoing edge to keep it linear
        // TODO: Handle branching scenarios later
        if (outgoingEdges.length > 0) {
            traverse(outgoingEdges[0].target);
        }
    }

    traverse(startingNode.id);
    return sequence;
}

/**
 * Convert timeline data to vTimelineData format for Remotion
 */
export function convertToVTimelineData(timelineData: TimelineData) {
    return timelineData.tracks.map(track => ({
        type: track.type,
        main: track.id === 'video-1', // First video track is main
        items: track.items.map(item => ({
            assetUrl: item.url || '',
            assetId: item.assetId,
            assetStartTime: item.assetStartTime,
            assetEndTime: item.assetEndTime,
            timelineStartTime: item.startTime,
            timelineEndTime: item.endTime,
            volume: item.volume,
            opacity: item.opacity,
        })),
    }));
}

/**
 * Format duration in MM:SS format
 */
export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert seconds to pixel position based on timeline scale
 */
export function timeToPixels(timeInSeconds: number, scale: number): number {
    return timeInSeconds * scale;
}

/**
 * Convert pixel position to time based on timeline scale
 */
export function pixelsToTime(pixels: number, scale: number): number {
    return pixels / scale;
} 