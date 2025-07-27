import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Composition filters validator
const compositionFiltersValidator = v.object({
    contrast: v.optional(v.number()),      // 0.5 to 2.0
    saturation: v.optional(v.number()),    // 0.0 to 3.0
    brightness: v.optional(v.number()),    // 0.5 to 2.0
    hueRotate: v.optional(v.number()),     // -180 to 180 degrees
    sepia: v.optional(v.number()),         // 0.0 to 1.0
    blur: v.optional(v.number()),          // 0 to 10 pixels
    grayscale: v.optional(v.number()),     // 0.0 to 1.0
    invert: v.optional(v.number()),        // 0.0 to 1.0
});

/**
 * Apply composition-level filters to the timeline (LUT-style effects)
 */
export const applyCompositionFilters = mutation({
    args: {
        projectId: v.id("projects"),
        filters: compositionFiltersValidator,
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Get the current project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        // Get current timeline data or create default
        const currentTimelineData = project.timelineData || {
            tracks: [],
            duration: 0,
            timelineScale: 50,
        };

        // Validate filter values
        const filters = args.filters;
        if (filters.contrast !== undefined && (filters.contrast < 0.5 || filters.contrast > 2.0)) {
            throw new Error("Contrast must be between 0.5 and 2.0");
        }
        if (filters.saturation !== undefined && (filters.saturation < 0.0 || filters.saturation > 3.0)) {
            throw new Error("Saturation must be between 0.0 and 3.0");
        }
        if (filters.brightness !== undefined && (filters.brightness < 0.5 || filters.brightness > 2.0)) {
            throw new Error("Brightness must be between 0.5 and 2.0");
        }
        if (filters.hueRotate !== undefined && (filters.hueRotate < -180 || filters.hueRotate > 180)) {
            throw new Error("Hue rotation must be between -180 and 180 degrees");
        }
        if (filters.sepia !== undefined && (filters.sepia < 0.0 || filters.sepia > 1.0)) {
            throw new Error("Sepia must be between 0.0 and 1.0");
        }
        if (filters.blur !== undefined && (filters.blur < 0 || filters.blur > 10)) {
            throw new Error("Blur must be between 0 and 10 pixels");
        }
        if (filters.grayscale !== undefined && (filters.grayscale < 0.0 || filters.grayscale > 1.0)) {
            throw new Error("Grayscale must be between 0.0 and 1.0");
        }
        if (filters.invert !== undefined && (filters.invert < 0.0 || filters.invert > 1.0)) {
            throw new Error("Invert must be between 0.0 and 1.0");
        }

        // Update the timeline data with new filters
        const updatedTimelineData = {
            ...currentTimelineData,
            compositionFilters: filters,
        };

        // Save the updated timeline data
        await ctx.db.patch(args.projectId, {
            timelineData: updatedTimelineData,
        });

        console.log(`Applied composition filters to project ${args.projectId}:`, filters);

        return null;
    },
});

/**
 * Clear all composition filters
 */
export const clearCompositionFilters = mutation({
    args: {
        projectId: v.id("projects"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // Get the current project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        // Get current timeline data
        const currentTimelineData = project.timelineData || {
            tracks: [],
            duration: 0,
            timelineScale: 50,
        };

        // Remove composition filters
        const updatedTimelineData = {
            ...currentTimelineData,
            compositionFilters: undefined,
        };

        // Save the updated timeline data
        await ctx.db.patch(args.projectId, {
            timelineData: updatedTimelineData,
        });

        console.log(`Cleared composition filters for project ${args.projectId}`);

        return null;
    },
});

/**
 * Place an asset on the timeline with precise positioning and properties
 */
export const placeAssetOnTimeline = mutation({
    args: {
        projectId: v.id("projects"),
        assetId: v.string(),
        startTime: v.number(),                    // Timeline start time in seconds
        endTime: v.optional(v.number()),          // Timeline end time (auto-calculate if not provided)
        trackType: v.union(v.literal("video"), v.literal("audio")),
        trackIndex: v.optional(v.number()),       // Preferred track index (auto-assign if not provided)

        // Overlay positioning (for video/image overlays)
        overlay: v.optional(v.object({
            x: v.number(),                        // pixels from left
            y: v.number(),                        // pixels from top
            width: v.number(),                    // pixels wide
            height: v.number(),                   // pixels tall
            zIndex: v.optional(v.number()),       // layer order
        })),

        // Audio/Visual properties
        volume: v.optional(v.number()),           // 0.0 to 2.0
        opacity: v.optional(v.number()),          // 0.0 to 1.0

        // Asset trimming (crop source material)
        assetStartTime: v.optional(v.number()),   // Start time within source asset
        assetEndTime: v.optional(v.number()),     // End time within source asset
    },
    returns: v.object({
        timelineItemId: v.string(),
        trackId: v.string(),
        message: v.string(),
    }),
    handler: async (ctx, args) => {
        // Get the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        // Get the asset to validate it exists and get metadata
        const asset = await ctx.db.get(args.assetId as Id<"assets">);

        if (!asset) {
            throw new Error(`Asset with ID ${args.assetId} not found`);
        }

        // Validate asset is in this project
        if (asset.projectId !== args.projectId) {
            throw new Error("Asset does not belong to this project");
        }

        // Validate parameters
        if (args.startTime < 0) {
            throw new Error("Start time cannot be negative");
        }
        if (args.volume !== undefined && (args.volume < 0 || args.volume > 2.0)) {
            throw new Error("Volume must be between 0.0 and 2.0");
        }
        if (args.opacity !== undefined && (args.opacity < 0 || args.opacity > 1.0)) {
            throw new Error("Opacity must be between 0.0 and 1.0");
        }

        // Get current timeline data or create default
        const currentTimelineData = project.timelineData || {
            tracks: [
                { id: 'video-1', type: 'video', name: 'Video 1', items: [] },
                { id: 'audio-1', type: 'audio', name: 'Audio 1', items: [] }
            ],
            duration: 0,
            timelineScale: 50,
        };

        // Calculate timeline timing
        const assetDuration = asset.metadata?.duration || 10; // Default to 10 seconds if no duration
        const effectiveAssetStartTime = args.assetStartTime || 0;
        const effectiveAssetEndTime = args.assetEndTime || assetDuration;
        const assetClipDuration = effectiveAssetEndTime - effectiveAssetStartTime;

        const timelineStartTime = args.startTime;
        const timelineEndTime = args.endTime || (timelineStartTime + assetClipDuration);

        if (timelineEndTime <= timelineStartTime) {
            throw new Error("End time must be greater than start time");
        }
        if (effectiveAssetEndTime <= effectiveAssetStartTime) {
            throw new Error("Asset end time must be greater than asset start time");
        }

        // Helper function to check for conflicts on a track
        const hasConflict = (track: any, newStart: number, newEnd: number) => {
            return track.items.some((item: any) =>
                newStart < item.endTime && newEnd > item.startTime
            );
        };

        // Helper function to find or create a suitable track
        const findOrCreateTrack = () => {
            const tracksOfType = currentTimelineData.tracks.filter(t => t.type === args.trackType);

            // Try preferred track if specified
            if (args.trackIndex !== undefined) {
                const preferredTrack = tracksOfType.find(t =>
                    t.id === `${args.trackType}-${args.trackIndex}`
                );
                if (preferredTrack && !hasConflict(preferredTrack, timelineStartTime, timelineEndTime)) {
                    return preferredTrack.id;
                }
            }

            // Find any available track of the same type
            for (const track of tracksOfType) {
                if (!hasConflict(track, timelineStartTime, timelineEndTime)) {
                    return track.id;
                }
            }

            // Create new track
            const newTrackIndex = tracksOfType.length + 1;
            const newTrackId = `${args.trackType}-${newTrackIndex}`;
            const newTrackName = `${args.trackType.charAt(0).toUpperCase() + args.trackType.slice(1)} ${newTrackIndex}`;

            currentTimelineData.tracks.push({
                id: newTrackId,
                type: args.trackType,
                name: newTrackName,
                items: [],
            });

            return newTrackId;
        };

        // Find or create suitable track
        const trackId = findOrCreateTrack();

        // Generate unique timeline item ID
        const timelineItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create timeline item
        const timelineItem = {
            id: timelineItemId,
            assetId: args.assetId,
            type: asset.type as 'video' | 'image' | 'audio' | 'draft',
            name: asset.name,
            url: asset.url,
            startTime: timelineStartTime,
            endTime: timelineEndTime,
            assetStartTime: effectiveAssetStartTime,
            assetEndTime: effectiveAssetEndTime,
            trackId,
            metadata: asset.metadata,
            overlay: args.overlay,
            volume: args.volume,
            opacity: args.opacity,
        };

        // Add item to the appropriate track
        const track = currentTimelineData.tracks.find(t => t.id === trackId);
        if (track) {
            track.items.push(timelineItem);
        }

        // Update timeline duration
        const newDuration = Math.max(currentTimelineData.duration, timelineEndTime);
        currentTimelineData.duration = newDuration;

        // Save updated timeline data
        await ctx.db.patch(args.projectId, {
            timelineData: currentTimelineData,
        });

        const trackInfo = track ? ` on ${track.name}` : '';
        const overlayInfo = args.overlay ? ` with overlay positioning (${args.overlay.x}, ${args.overlay.y})` : '';
        const trimInfo = (args.assetStartTime || args.assetEndTime) ?
            ` (trimmed from ${effectiveAssetStartTime}s to ${effectiveAssetEndTime}s)` : '';

        console.log(`Placed asset ${args.assetId} on timeline${trackInfo}${overlayInfo}${trimInfo}`);

        return {
            timelineItemId,
            trackId,
            message: `Successfully placed "${asset.name}"${trackInfo} from ${timelineStartTime}s to ${timelineEndTime}s${overlayInfo}${trimInfo}`,
        };
    },
});

/**
 * Modify properties of an existing timeline asset
 */
export const modifyTimelineAsset = mutation({
    args: {
        projectId: v.id("projects"),
        timelineItemId: v.string(),                   // ID of timeline item to modify

        // Timeline positioning changes
        startTime: v.optional(v.number()),            // New start time
        endTime: v.optional(v.number()),              // New end time

        // Overlay positioning changes
        overlay: v.optional(v.object({
            x: v.optional(v.number()),                // pixels from left
            y: v.optional(v.number()),                // pixels from top
            width: v.optional(v.number()),            // pixels wide
            height: v.optional(v.number()),           // pixels tall
            zIndex: v.optional(v.number()),           // layer order
        })),

        // Audio/Visual property changes
        volume: v.optional(v.number()),               // 0.0 to 2.0
        opacity: v.optional(v.number()),              // 0.0 to 1.0

        // Asset trimming changes
        assetStartTime: v.optional(v.number()),       // Start time within source asset
        assetEndTime: v.optional(v.number()),         // End time within source asset

        // Track changes
        moveToTrackId: v.optional(v.string()),        // Move to different track
        moveToTrackType: v.optional(v.union(v.literal("video"), v.literal("audio"))), // Move to different track type
    },
    returns: v.object({
        success: v.boolean(),
        message: v.string(),
        updatedItem: v.optional(v.any()),
    }),
    handler: async (ctx, args) => {
        // Get the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        // Get current timeline data
        const currentTimelineData = project.timelineData || {
            tracks: [
                { id: 'video-1', type: 'video', name: 'Video 1', items: [] },
                { id: 'audio-1', type: 'audio', name: 'Audio 1', items: [] }
            ],
            duration: 0,
            timelineScale: 50,
        };

        // Find the timeline item to modify
        let targetItem: any = null;
        let targetTrack: any = null;

        for (const track of currentTimelineData.tracks) {
            const item = track.items.find((item: any) => item.id === args.timelineItemId);
            if (item) {
                targetItem = item;
                targetTrack = track;
                break;
            }
        }

        if (!targetItem) {
            throw new Error(`Timeline item with ID ${args.timelineItemId} not found`);
        }

        // Validate parameters
        if (args.volume !== undefined && (args.volume < 0 || args.volume > 2.0)) {
            throw new Error("Volume must be between 0.0 and 2.0");
        }
        if (args.opacity !== undefined && (args.opacity < 0 || args.opacity > 1.0)) {
            throw new Error("Opacity must be between 0.0 and 1.0");
        }

        // Calculate new timing
        const newStartTime = args.startTime ?? targetItem.startTime;
        const newEndTime = args.endTime ?? targetItem.endTime;

        if (newEndTime <= newStartTime) {
            throw new Error("End time must be greater than start time");
        }

        // Validate asset trimming
        if (args.assetStartTime !== undefined && args.assetEndTime !== undefined) {
            if (args.assetEndTime <= args.assetStartTime) {
                throw new Error("Asset end time must be greater than asset start time");
            }
        }

        // Handle track movement
        let newTrackId = targetItem.trackId;
        if (args.moveToTrackId || args.moveToTrackType) {
            if (args.moveToTrackType) {
                // Find or create track of the specified type
                const tracksOfType = currentTimelineData.tracks.filter(t => t.type === args.moveToTrackType);

                // Check for conflicts in existing tracks
                let foundAvailableTrack = false;
                for (const track of tracksOfType) {
                    const hasConflict = track.items.some((item: any) =>
                        item.id !== args.timelineItemId && // Don't conflict with itself
                        newStartTime < item.endTime && newEndTime > item.startTime
                    );
                    if (!hasConflict) {
                        newTrackId = track.id;
                        foundAvailableTrack = true;
                        break;
                    }
                }

                // Create new track if needed
                if (!foundAvailableTrack) {
                    const newTrackIndex = tracksOfType.length + 1;
                    newTrackId = `${args.moveToTrackType}-${newTrackIndex}`;
                    const newTrackName = `${args.moveToTrackType.charAt(0).toUpperCase() + args.moveToTrackType.slice(1)} ${newTrackIndex}`;

                    currentTimelineData.tracks.push({
                        id: newTrackId,
                        type: args.moveToTrackType,
                        name: newTrackName,
                        items: [],
                    });
                }
            } else if (args.moveToTrackId) {
                // Use specific track ID
                const targetTrackExists = currentTimelineData.tracks.find(t => t.id === args.moveToTrackId);
                if (!targetTrackExists) {
                    throw new Error(`Target track ${args.moveToTrackId} not found`);
                }

                // Check for conflicts
                const hasConflict = targetTrackExists.items.some((item: any) =>
                    item.id !== args.timelineItemId && // Don't conflict with itself
                    newStartTime < item.endTime && newEndTime > item.startTime
                );

                if (hasConflict) {
                    throw new Error(`Cannot move to track ${args.moveToTrackId}: time conflict detected`);
                }

                newTrackId = args.moveToTrackId;
            }
        }

        // Apply changes to the item
        const changes: string[] = [];

        if (args.startTime !== undefined) {
            targetItem.startTime = newStartTime;
            changes.push(`start time: ${newStartTime}s`);
        }
        if (args.endTime !== undefined) {
            targetItem.endTime = newEndTime;
            changes.push(`end time: ${newEndTime}s`);
        }
        if (args.volume !== undefined) {
            targetItem.volume = args.volume;
            changes.push(`volume: ${args.volume}`);
        }
        if (args.opacity !== undefined) {
            targetItem.opacity = args.opacity;
            changes.push(`opacity: ${args.opacity}`);
        }
        if (args.assetStartTime !== undefined) {
            targetItem.assetStartTime = args.assetStartTime;
            changes.push(`asset start: ${args.assetStartTime}s`);
        }
        if (args.assetEndTime !== undefined) {
            targetItem.assetEndTime = args.assetEndTime;
            changes.push(`asset end: ${args.assetEndTime}s`);
        }

        // Handle overlay changes
        if (args.overlay) {
            if (!targetItem.overlay) {
                targetItem.overlay = {};
            }
            if (args.overlay.x !== undefined) {
                targetItem.overlay.x = args.overlay.x;
                changes.push(`overlay x: ${args.overlay.x}px`);
            }
            if (args.overlay.y !== undefined) {
                targetItem.overlay.y = args.overlay.y;
                changes.push(`overlay y: ${args.overlay.y}px`);
            }
            if (args.overlay.width !== undefined) {
                targetItem.overlay.width = args.overlay.width;
                changes.push(`overlay width: ${args.overlay.width}px`);
            }
            if (args.overlay.height !== undefined) {
                targetItem.overlay.height = args.overlay.height;
                changes.push(`overlay height: ${args.overlay.height}px`);
            }
            if (args.overlay.zIndex !== undefined) {
                targetItem.overlay.zIndex = args.overlay.zIndex;
                changes.push(`overlay z-index: ${args.overlay.zIndex}`);
            }
        }

        // Handle track movement
        if (newTrackId !== targetItem.trackId) {
            // Remove from old track
            targetTrack.items = targetTrack.items.filter((item: any) => item.id !== args.timelineItemId);

            // Add to new track
            const newTrack = currentTimelineData.tracks.find(t => t.id === newTrackId);
            if (newTrack) {
                targetItem.trackId = newTrackId;
                newTrack.items.push(targetItem);
                changes.push(`moved to ${newTrack.name}`);
            }
        }

        // Update timeline duration
        const maxEndTime = Math.max(...currentTimelineData.tracks.flatMap(track =>
            track.items.map((item: any) => item.endTime)
        ));
        currentTimelineData.duration = Math.max(currentTimelineData.duration, maxEndTime);

        // Save updated timeline data
        await ctx.db.patch(args.projectId, {
            timelineData: currentTimelineData,
        });

        const changeDescription = changes.length > 0 ? changes.join(', ') : 'no changes';
        console.log(`Modified timeline item ${args.timelineItemId}: ${changeDescription}`);

        return {
            success: true,
            message: `Successfully modified "${targetItem.name}": ${changeDescription}`,
            updatedItem: targetItem,
        };
    },
});

/**
 * Reorder timeline assets within a track or across tracks
 */
export const reorderTimelineAssets = mutation({
    args: {
        projectId: v.id("projects"),
        reorderingType: v.union(v.literal("within_track"), v.literal("across_tracks")),

        // For within_track reordering
        trackId: v.optional(v.string()),              // Required for within_track
        itemOrder: v.optional(v.array(v.string())),   // Array of timeline item IDs in new order

        // For across_tracks reordering
        trackAssignments: v.optional(v.array(v.object({
            itemId: v.string(),                       // Timeline item ID
            trackId: v.string(),                      // Target track ID
            position: v.number(),                     // Position within track (0-based)
        }))),

        // Timing options
        timingMode: v.union(
            v.literal("maintain_original"),           // Keep original start/end times
            v.literal("sequential"),                  // Make clips sequential with no gaps
            v.literal("preserve_gaps")                // Sequential but preserve relative gaps
        ),
        gapDuration: v.optional(v.number()),          // Gap between clips for sequential mode (default 0)
    },
    returns: v.object({
        success: v.boolean(),
        message: v.string(),
        reorderedItems: v.optional(v.array(v.any())),
        conflictsResolved: v.optional(v.array(v.string())),
    }),
    handler: async (ctx, args) => {
        // Get the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        // Get current timeline data
        const currentTimelineData = project.timelineData || {
            tracks: [
                { id: 'video-1', type: 'video', name: 'Video 1', items: [] },
                { id: 'audio-1', type: 'audio', name: 'Audio 1', items: [] }
            ],
            duration: 0,
            timelineScale: 50,
        };

        let reorderedItems: any[] = [];
        let conflictsResolved: string[] = [];

        if (args.reorderingType === "within_track") {
            // Reorder within a single track
            if (!args.trackId || !args.itemOrder) {
                throw new Error("trackId and itemOrder are required for within_track reordering");
            }

            const track = currentTimelineData.tracks.find(t => t.id === args.trackId);
            if (!track) {
                throw new Error(`Track ${args.trackId} not found`);
            }

            // Validate all items exist in this track
            const trackItemIds = track.items.map((item: any) => item.id);
            const invalidItems = args.itemOrder.filter(id => !trackItemIds.includes(id));
            if (invalidItems.length > 0) {
                throw new Error(`Items not found in track ${args.trackId}: ${invalidItems.join(', ')}`);
            }

            // Reorder the items
            const reorderedTrackItems = args.itemOrder.map(id =>
                track.items.find((item: any) => item.id === id)
            ).filter((item): item is any => Boolean(item));

            // Apply timing based on mode
            if (args.timingMode === "sequential" || args.timingMode === "preserve_gaps") {
                let currentTime = 0;
                const gap = args.gapDuration || 0;

                if (args.timingMode === "preserve_gaps" && reorderedTrackItems.length > 1) {
                    // Calculate original gaps
                    const originalItems = [...track.items].sort((a: any, b: any) => a.startTime - b.startTime);
                    const originalGaps: number[] = [];
                    for (let i = 1; i < originalItems.length; i++) {
                        originalGaps.push(Math.max(0, originalItems[i].startTime - originalItems[i - 1].endTime));
                    }

                    // Apply with preserved gaps
                    reorderedTrackItems.forEach((item: any, index: number) => {
                        const duration = item.endTime - item.startTime;
                        item.startTime = currentTime;
                        item.endTime = currentTime + duration;

                        if (index < reorderedTrackItems.length - 1) {
                            const preservedGap = originalGaps[index] || gap;
                            currentTime = item.endTime + preservedGap;
                        }
                    });
                } else {
                    // Sequential with fixed gap
                    reorderedTrackItems.forEach((item: any) => {
                        const duration = item.endTime - item.startTime;
                        item.startTime = currentTime;
                        item.endTime = currentTime + duration;
                        currentTime = item.endTime + gap;
                    });
                }
            }
            // For maintain_original, we don't change timing

            track.items = reorderedTrackItems;
            reorderedItems = reorderedTrackItems;

        } else if (args.reorderingType === "across_tracks") {
            // Reorder across multiple tracks
            if (!args.trackAssignments) {
                throw new Error("trackAssignments is required for across_tracks reordering");
            }

            // Group assignments by track
            const assignmentsByTrack = new Map<string, Array<{ itemId: string, position: number }>>();
            for (const assignment of args.trackAssignments) {
                if (!assignmentsByTrack.has(assignment.trackId)) {
                    assignmentsByTrack.set(assignment.trackId, []);
                }
                assignmentsByTrack.get(assignment.trackId)!.push({
                    itemId: assignment.itemId,
                    position: assignment.position
                });
            }

            // Find all items to move
            const itemsToMove = new Map<string, any>();
            for (const track of currentTimelineData.tracks) {
                for (let i = track.items.length - 1; i >= 0; i--) {
                    const item = track.items[i];
                    const assignment = args.trackAssignments.find(a => a.itemId === item.id);
                    if (assignment) {
                        itemsToMove.set(item.id, item);
                        // Remove from current track
                        track.items.splice(i, 1);
                    }
                }
            }

            // Place items in new tracks
            for (const [trackId, assignments] of assignmentsByTrack) {
                const track = currentTimelineData.tracks.find(t => t.id === trackId);
                if (!track) {
                    throw new Error(`Target track ${trackId} not found`);
                }

                // Sort assignments by position
                assignments.sort((a, b) => a.position - b.position);

                // Insert items at specified positions
                assignments.forEach(assignment => {
                    const item = itemsToMove.get(assignment.itemId);
                    if (item) {
                        track.items.splice(assignment.position, 0, item);
                        reorderedItems.push(item);
                    }
                });

                // Apply timing within track if sequential
                if (args.timingMode === "sequential" || args.timingMode === "preserve_gaps") {
                    let currentTime = 0;
                    const gap = args.gapDuration || 0;

                    track.items.forEach((item: any) => {
                        const duration = item.endTime - item.startTime;
                        item.startTime = currentTime;
                        item.endTime = currentTime + duration;
                        currentTime = item.endTime + gap;
                    });
                }
            }
        }

        // Check for and resolve conflicts
        if (args.timingMode === "maintain_original") {
            for (const track of currentTimelineData.tracks) {
                const overlaps = [];
                for (let i = 0; i < track.items.length - 1; i++) {
                    for (let j = i + 1; j < track.items.length; j++) {
                        const item1 = track.items[i];
                        const item2 = track.items[j];
                        if (item1.startTime < item2.endTime && item1.endTime > item2.startTime) {
                            overlaps.push(`${item1.name} and ${item2.name}`);
                        }
                    }
                }
                if (overlaps.length > 0) {
                    conflictsResolved.push(`Detected overlaps in ${track.name}: ${overlaps.join(', ')}`);
                }
            }
        }

        // Update timeline duration
        const maxEndTime = Math.max(...currentTimelineData.tracks.flatMap(track =>
            track.items.map((item: any) => item.endTime)
        ));
        currentTimelineData.duration = Math.max(currentTimelineData.duration, maxEndTime);

        // Save updated timeline data
        await ctx.db.patch(args.projectId, {
            timelineData: currentTimelineData,
        });

        const reorderType = args.reorderingType === "within_track" ? "within track" : "across tracks";
        const timingDesc = args.timingMode === "maintain_original" ? "maintaining original timing" :
            args.timingMode === "sequential" ? "making clips sequential" :
                "preserving relative gaps";

        console.log(`Reordered ${reorderedItems.length} items ${reorderType} with ${timingDesc}`);

        return {
            success: true,
            message: `Successfully reordered ${reorderedItems.length} timeline items ${reorderType}, ${timingDesc}${conflictsResolved.length > 0 ? '. Conflicts detected.' : '.'}`,
            reorderedItems,
            conflictsResolved: conflictsResolved.length > 0 ? conflictsResolved : undefined,
        };
    },
}); 