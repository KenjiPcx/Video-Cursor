import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Player } from "@remotion/player";
import { TimelineComposition, TimelineCompositionSchema } from "../remotion/timeline-composition";
import { Edge } from '@xyflow/react';
import { useMemo } from "react";
import { z } from "zod";
import { populateTimelineFromGraph } from "../components/timeline/timeline-utils";
import { EditorNodeType } from "./editor-graph";

interface TimelinePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: EditorNodeType[];
    edges: Edge[];
}

export function TimelinePreviewModal({
    isOpen,
    onClose,
    nodes,
    edges,
}: TimelinePreviewModalProps) {

    const timelineProps: z.infer<typeof TimelineCompositionSchema> | null = useMemo(() => {
        try {
            // Get timeline data from graph (same logic as timeline panel)
            const timelineData = populateTimelineFromGraph(nodes, edges);

            // Check if we have any items to preview
            const hasItems = timelineData.tracks.some(track => track.items.length > 0);
            if (!hasItems || timelineData.duration === 0) {
                return null;
            }

            return {
                timelineData,
                backgroundColor: '#1a1a1a',
                masterVolume: 1,
                renderQuality: 'preview' as const,
                maxConcurrentAssets: 10,
                enableLayerCulling: true,
            };
        } catch (error) {
            console.error('Error converting timeline data for preview:', error);
            return null;
        }
    }, [nodes, edges]);

    // Calculate video dimensions and timing
    const fps = 30;
    const durationInFrames = timelineProps ? Math.ceil(timelineProps.timelineData.duration * fps) : 30 * fps; // Default to 30 seconds
    const videoWidth = 1920;
    const videoHeight = 1080;

    if (!timelineProps) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="min-w-[85vw] max-w-[85vw] max-w-6xl w-[90vw] h-[80vh] max-h-none">
                    <DialogHeader>
                        <DialogTitle>Timeline Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 flex items-center justify-center bg-zinc-900 rounded-lg">
                        <div className="text-center text-zinc-400">
                            <p className="text-lg font-medium">No timeline content to preview</p>
                            <p className="text-sm mt-1">Add some assets to your timeline and connect them to the starting node.</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="min-w-[85vw] max-w-[85vw] max-w-6xl w-[90vw] h-[80vh] max-h-none">
                <DialogHeader>
                    <DialogTitle>Timeline Preview</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <div className="w-full h-full max-h-full" style={{ aspectRatio: '16/9' }}>
                        <Player
                            component={TimelineComposition}
                            inputProps={timelineProps}
                            durationInFrames={durationInFrames}
                            fps={fps}
                            compositionHeight={videoHeight}
                            compositionWidth={videoWidth}
                            style={{
                                width: "100%",
                                height: "100%",
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain"
                            }}
                            controls
                            autoPlay={false}
                            loop={false}
                        />
                    </div>
                </div>
                <div className="mt-4 text-sm text-zinc-400 flex-shrink-0">
                    <p>Duration: {Math.round(timelineProps.timelineData.duration)}s • Tracks: {timelineProps.timelineData.tracks.length} • Resolution: {videoWidth}x{videoHeight}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
} 