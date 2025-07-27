import { v } from "convex/values";

// Attachment validator for chat attachments
export const vAttachment = v.object({
    name: v.string(),
    url: v.string(),
    contentType: v.string(),
    key: v.optional(v.string()), // R2 key for uploaded files
});

export const vAsset = v.object({
    projectId: v.id("projects"),
    name: v.string(),
    type: v.union(
        v.literal("video"),
        v.literal("audio"),
        v.literal("image"),
        v.literal("text"),
        v.literal("other")
    ),
    category: v.union(
        v.literal("upload"),
        v.literal("artifact")
    ),
    url: v.string(), // R2 URL
    key: v.string(), // R2 key for file identification
    description: v.optional(v.string()), // User-provided description for better AI context
    metadata: v.optional(v.object({
        duration: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
        mimeType: v.optional(v.string()),
        // Generation metadata for artifacts
        generationPrompt: v.optional(v.string()),
        generationModel: v.optional(v.string()),
        generationParams: v.optional(v.any()),
        analysis: v.optional(v.object({
            quickSummary: v.optional(v.string()),
            detailedSummary: v.optional(v.string()),
            analyzedAt: v.optional(v.number()),
            analysisModel: v.optional(v.string()),
        })),
        transcription: v.optional(v.object({
            srt: v.string(),              // Full SRT format content
            rawTranscription: v.any(),    // Raw Whisper API response
            duration: v.number(),         // Audio duration from Whisper
            transcribedAt: v.number(),    // Timestamp when transcribed
            model: v.string(),           // "whisper-1"
        })),
        // Video splitting metadata
        trimStart: v.optional(v.number()), // Start time for trimmed segments (seconds)
        trimEnd: v.optional(v.number()),   // End time for trimmed segments (seconds)
    })),
})

export const vStaticAsset = v.object({
    name: v.string(),
    type: v.union(
        v.literal("video"),
        v.literal("audio"),
        v.literal("image"),
        v.literal("text"),
        v.literal("template"),
        v.literal("other")
    ),
    url: v.string(), // R2 URL
    key: v.string(), // R2 key for file identification
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.object({
        duration: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
        mimeType: v.optional(v.string()),
    })),
})

// Timeline item structure
export const vTimelineItem = v.object({
    id: v.string(), // Unique timeline item ID
    assetId: v.optional(v.string()), // Reference to original asset
    type: v.union(v.literal("video"), v.literal("image"), v.literal("audio"), v.literal("draft")),
    name: v.string(),
    url: v.optional(v.string()),

    // Absolute positioning on timeline (in seconds)
    startTime: v.number(), // When item starts on timeline
    endTime: v.number(),   // When item ends on timeline

    // Asset portion to use (for trimming/cropping)
    assetStartTime: v.number(), // Start time within the source asset
    assetEndTime: v.number(),   // End time within the source asset

    // Track assignment
    trackId: v.string(),

    // Metadata
    metadata: v.optional(v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
        mimeType: v.optional(v.string()),
        duration: v.optional(v.number()), // Original asset duration
    })),

    // Overlay positioning (for video/image overlays)
    overlay: v.optional(v.object({
        x: v.number(),        // pixels from left edge
        y: v.number(),        // pixels from top edge
        width: v.number(),    // pixels wide
        height: v.number(),   // pixels tall
        zIndex: v.optional(v.number()),  // layer order
    })),

    // Audio/Visual properties
    volume: v.optional(v.number()),   // 0.0 to 2.0 for audio
    opacity: v.optional(v.number()),  // 0.0 to 1.0 for video/image transparency
});

// Timeline track structure
export const vTimelineTrack = v.object({
    id: v.string(),
    type: v.union(v.literal("video"), v.literal("audio")),
    name: v.string(), // "Video 1", "Audio 1", etc.
    items: v.array(vTimelineItem),
    muted: v.optional(v.boolean()),
    locked: v.optional(v.boolean()),
});

// Composition filters structure
export const vCompositionFilters = v.object({
    contrast: v.optional(v.number()),    // 0.5 to 2.0
    saturation: v.optional(v.number()),  // 0.0 to 3.0
    brightness: v.optional(v.number()),  // 0.5 to 2.0
    hueRotate: v.optional(v.number()),   // -180 to 180 degrees
    sepia: v.optional(v.number()),       // 0.0 to 1.0
    blur: v.optional(v.number()),        // 0 to 10 pixels
    grayscale: v.optional(v.number()),   // 0.0 to 1.0
    invert: v.optional(v.number()),      // 0.0 to 1.0
});

// Timeline data structure for video editing
export const vTimelineData = v.object({
    tracks: v.array(vTimelineTrack),
    duration: v.number(), // Total timeline duration
    timelineScale: v.number(), // Pixels per second for display
    compositionFilters: v.optional(vCompositionFilters),
})

// Hidden context for projects (not exposed in public API)
export const vHiddenProjectContext = v.object({
    attachments: v.optional(v.array(vAttachment)),
})

export const vProject = v.object({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(
        v.literal("draft"),
        v.literal("in-progress"),
        v.literal("completed")
    )),
    timelineData: v.optional(vTimelineData), // Structured timeline data
    context: v.optional(v.object({
        attachments: v.optional(v.array(vAttachment)),
    })),
})