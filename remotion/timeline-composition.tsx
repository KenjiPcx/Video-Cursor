import { AbsoluteFill, useVideoConfig, Sequence, Img, CalculateMetadataFunction, Audio, OffthreadVideo, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import React from 'react';

// Define the timeline data schema matching our timeline-utils
export const TimelineItemSchema = z.object({
    id: z.string(),
    assetId: z.string().optional(),
    type: z.enum(['video', 'image', 'audio', 'draft']),
    name: z.string(),
    url: z.string().optional(),
    startTime: z.number(), // in seconds
    endTime: z.number(),   // in seconds
    assetStartTime: z.number(), // for trimming source asset
    assetEndTime: z.number(),   // for trimming source asset
    trackId: z.string(),
    metadata: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
        duration: z.number().optional(),
    }).optional(),
    volume: z.number().optional(),
    opacity: z.number().optional(),
});

export const TimelineTrackSchema = z.object({
    id: z.string(),
    type: z.enum(['video', 'audio']),
    name: z.string(),
    items: z.array(TimelineItemSchema),
    muted: z.boolean().optional(),
    locked: z.boolean().optional(),
    volume: z.number().optional(), // Track-level volume
});

export const TimelineDataSchema = z.object({
    tracks: z.array(TimelineTrackSchema),
    duration: z.number(), // in seconds
    timelineScale: z.number(), // pixels per second
});

// Enhanced schema for composition props with real editing features
export const TimelineCompositionSchema = z.object({
    timelineData: TimelineDataSchema,
    backgroundUrl: z.string().optional(),
    backgroundColor: z.string().default('black'),
    // Real editing workflow settings
    masterVolume: z.number().default(1),
    renderQuality: z.enum(['draft', 'preview', 'final']).default('preview'),
    maxConcurrentAssets: z.number().default(10), // Performance limiting
    enableLayerCulling: z.boolean().default(true), // Performance optimization
});

export type TimelineCompositionProps = z.infer<typeof TimelineCompositionSchema>;
export type TimelineItem = z.infer<typeof TimelineItemSchema>;
export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;

// Calculate metadata based on timeline duration
export const calculateTimelineMetadata: CalculateMetadataFunction<TimelineCompositionProps> = async ({ props }) => {
    const { timelineData } = props;
    const fps = 30;

    if (!timelineData || timelineData.duration === 0) {
        return {
            durationInFrames: 60 * fps, // Default to 60 seconds
            props,
        };
    }

    return {
        props,
        durationInFrames: Math.ceil(timelineData.duration * fps),
    };
};

// Get zIndex for proper layering
function getLayerZIndex(item: TimelineItem, trackId: string): number {
    // Background elements (draft scenes) go behind everything
    if (item.type === 'draft') return 0;

    // Video tracks stack based on track order, starting from 1
    if (item.type === 'video' || item.type === 'image') {
        const trackNumber = parseInt(trackId.split('-')[1]) || 1;
        return trackNumber;
    }

    // Audio has no visual zIndex but we'll set it high for consistency
    if (item.type === 'audio') return 1000;

    return 1;
}

// Check if layer should be rendered (performance optimization)
function shouldRenderLayer(
    item: TimelineItem,
    currentFrame: number,
    fps: number,
    enableCulling: boolean
): boolean {
    if (!enableCulling) return true;

    const startFrame = Math.round(item.startTime * fps); // Better precision
    const endFrame = Math.round(item.endTime * fps);

    // Only render if layer is active in current time window
    return currentFrame >= startFrame && currentFrame < endFrame;
}

// Component to render a single timeline item as a layer
function TimelineLayer({
    item,
    track,
    fps,
    masterVolume,
    renderQuality,
    enableLayerCulling
}: {
    item: TimelineItem;
    track: TimelineTrack;
    fps: number;
    masterVolume: number;
    renderQuality: 'draft' | 'preview' | 'final';
    enableLayerCulling: boolean;
}) {
    const currentFrame = useCurrentFrame();

    // Performance: Skip rendering if layer is not visible
    if (!shouldRenderLayer(item, currentFrame, fps, enableLayerCulling)) {
        return null;
    }

    const startFrame = Math.round(item.startTime * fps); // Better precision
    const durationInFrames = Math.round((item.endTime - item.startTime) * fps);

    // Asset trimming (use only part of source asset)
    const assetStartFrame = Math.round(item.assetStartTime * fps);
    const assetEndFrame = Math.round(item.assetEndTime * fps);

    if (durationInFrames <= 0) {
        return null;
    }

    const layerStyle = {
        opacity: item.opacity ?? 1,
        zIndex: getLayerZIndex(item, item.trackId),
    };

    // Adjust media quality based on render settings
    const mediaStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        imageRendering: renderQuality === 'draft' ? 'pixelated' as const : 'auto' as const,
    };

    // Calculate final volume for audio mixing
    const finalVolume = (item.volume ?? 1) * (track.volume ?? 1) * masterVolume;

    return (
        <Sequence
            from={startFrame}
            durationInFrames={durationInFrames}
            name={`${item.type}: ${item.name}`}
            layout="none"
        >
            <AbsoluteFill style={layerStyle}>
                {item.type === 'video' && item.url && (
                    <OffthreadVideo
                        src={item.url}
                        style={mediaStyle}
                        muted // Video tracks are muted, audio comes from audio tracks
                        startFrom={assetStartFrame} // Trim source video
                        endAt={assetEndFrame}
                    />
                )}

                {item.type === 'image' && item.url && (
                    <Img
                        src={item.url}
                        style={mediaStyle}
                        alt={item.name}
                    />
                )}

                {/* Audio mixing with track-level controls */}
                {item.type === 'audio' && item.url && !track.muted && finalVolume > 0 && (
                    <Audio
                        src={item.url}
                        volume={finalVolume}
                        startFrom={assetStartFrame} // Trim source audio
                        endAt={assetEndFrame}
                    />
                )}

                {item.type === 'draft' && (
                    <AbsoluteFill style={{
                        backgroundColor: renderQuality === 'draft' ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255, 165, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: renderQuality === 'draft' ? '24px' : '36px',
                        fontWeight: 'bold',
                        border: '4px dashed rgba(255, 165, 0, 0.6)',
                    }}>
                        {renderQuality === 'draft' ? item.name : `DRAFT: ${item.name}`}
                    </AbsoluteFill>
                )}
            </AbsoluteFill>
        </Sequence>
    );
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({
    timelineData,
    backgroundUrl,
    backgroundColor = 'black',
    masterVolume = 1,
    renderQuality = 'preview',
    maxConcurrentAssets = 10,
    enableLayerCulling = true
}) => {
    const { fps } = useVideoConfig();
    const currentFrame = useCurrentFrame();

    if (!timelineData || timelineData.tracks.length === 0) {
        return (
            <AbsoluteFill style={{
                backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '32px'
            }}>
                No timeline data available
            </AbsoluteFill>
        );
    }

    // Performance: Limit concurrent assets if needed
    let allLayers = timelineData.tracks.flatMap(track =>
        track.items.map(item => ({ item, track }))
    );

    if (enableLayerCulling && maxConcurrentAssets > 0) {
        // Sort by proximity to current frame for better performance
        allLayers = allLayers
            .filter(({ item }) => shouldRenderLayer(item, currentFrame, fps, true))
            .slice(0, maxConcurrentAssets);
    }

    return (
        <AbsoluteFill style={{ backgroundColor }}>
            {/* Background layer (zIndex: -1) */}
            {backgroundUrl && (
                <Sequence from={0} layout="none">
                    <AbsoluteFill style={{ zIndex: -1 }}>
                        {backgroundUrl.endsWith('.mp4') || backgroundUrl.endsWith('.webm') ? (
                            <OffthreadVideo
                                src={backgroundUrl}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                muted
                                volume={masterVolume}
                            />
                        ) : (
                            <Img
                                src={backgroundUrl}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                alt="Background"
                            />
                        )}
                    </AbsoluteFill>
                </Sequence>
            )}

            {/* Render all timeline items as layers with proper zIndex stacking */}
            {allLayers.map(({ item, track }) => (
                <TimelineLayer
                    key={item.id}
                    item={item}
                    track={track}
                    fps={fps}
                    masterVolume={masterVolume}
                    renderQuality={renderQuality}
                    enableLayerCulling={enableLayerCulling}
                />
            ))}

            {/* Performance debug info for draft renders */}
            {renderQuality === 'draft' && (
                <AbsoluteFill style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    color: 'yellow',
                    fontSize: '12px',
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}>
                    Frame: {currentFrame} | Layers: {allLayers.length}
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
}; 