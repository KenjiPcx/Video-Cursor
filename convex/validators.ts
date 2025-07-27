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
    url: v.string(), // R2 URL
    key: v.string(), // R2 key for file identification
    metadata: v.optional(v.object({
        duration: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        size: v.optional(v.number()),
        mimeType: v.optional(v.string()),
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

// Timeline data structure for video editing
export const vTimelineData = v.array(v.object({
    type: v.union(v.literal("video"), v.literal("audio")),
    main: v.boolean(), // Flag to indicate if this is the main timeline for the editor
    items: v.array(v.object({
        assetUrl: v.string(), // URL or reference to the asset
        assetKey: v.optional(v.string()), // R2 key instead of asset ID
        assetId: v.optional(v.id("assets")), // Optional reference to asset in our database
        // Asset crop/trim times (what portion of the asset to use)
        assetStartTime: v.number(), // Start time within the asset (in seconds)
        assetEndTime: v.number(),   // End time within the asset (in seconds)
        // Timeline placement (where this item sits on the timeline)
        timelineStartTime: v.number(), // Start time on the timeline (in seconds)
        timelineEndTime: v.number(),   // End time on the timeline (in seconds)
        // Optional properties for editing
        volume: v.optional(v.number()), // For audio tracks (0-1)
        opacity: v.optional(v.number()), // For video tracks (0-1)
        endTransition: v.optional(v.object({ // Only transition on the end of the asset
            type: v.union(v.literal("fade"), v.literal("slide")),
            duration: v.optional(v.number()),
        })),
    })),
}))

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