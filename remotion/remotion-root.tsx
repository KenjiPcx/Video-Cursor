import { Composition } from 'remotion';
import { TimelineComposition, TimelineCompositionSchema, calculateTimelineMetadata } from './timeline-composition';
import React from 'react';
import { z } from 'zod';

// Simple timeline example props
const defaultProps: z.infer<typeof TimelineCompositionSchema> = {
    masterVolume: 1,
    renderQuality: 'preview',
    maxConcurrentAssets: 10,
    enableLayerCulling: true,
    timelineData: {
        tracks: [
            {
                id: 'video-1',
                type: 'video',
                name: 'Video 1',
                items: [
                    {
                        id: 'item-1',
                        type: 'draft',
                        name: 'Opening Scene',
                        startTime: 0,
                        endTime: 3,
                        assetStartTime: 0,
                        assetEndTime: 3,
                        trackId: 'video-1',
                        opacity: 1,
                    },
                    {
                        id: 'item-2',
                        type: 'draft',
                        name: 'Main Content',
                        startTime: 3,
                        endTime: 7,
                        assetStartTime: 0,
                        assetEndTime: 4,
                        trackId: 'video-1',
                        opacity: 1,
                    },
                    {
                        id: 'item-3',
                        type: 'draft',
                        name: 'Closing',
                        startTime: 7,
                        endTime: 10,
                        assetStartTime: 0,
                        assetEndTime: 3,
                        trackId: 'video-1',
                        opacity: 1,
                    }
                ],
            }
        ],
        duration: 10,
        timelineScale: 50,
    },
    backgroundColor: '#1a1a1a',
};

// You can edit the duration in frames of the video here.
const durationInFrames = 1200; // This will be overridden by calculateMetadata
const fps = 30;

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Timeline"
                component={TimelineComposition}
                durationInFrames={durationInFrames} // 10 seconds at 30fps
                fps={fps}
                width={1920}
                height={1080}
                schema={TimelineCompositionSchema}
                defaultProps={defaultProps}
                calculateMetadata={calculateTimelineMetadata}
            />
        </>
    );
}; 