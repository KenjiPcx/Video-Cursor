import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Create a new node
export const create = mutation({
    args: {
        projectId: v.id("projects"),
        type: v.union(v.literal("starting"), v.literal("draft"), v.literal("videoAsset"), v.literal("imageAsset"), v.literal("generatingAsset")),
        position: v.object({
            x: v.number(),
            y: v.number(),
        }),
        data: v.any(),
    },
    returns: v.id("nodes"),
    handler: async (ctx, args) => {
        const nodeId = await ctx.db.insert("nodes", args);
        return nodeId;
    },
});

// Create a generating asset node for AI generation
export const createGeneratingNode = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.string(),
        expectedType: v.union(v.literal("video"), v.literal("audio"), v.literal("image")),
        generationModel: v.string(),
        generationPrompt: v.string(),
        generationParams: v.any(),
    },
    handler: async (ctx, args): Promise<Id<"nodes">> => {
        // Get existing nodes to calculate position
        const existingNodes = await ctx.db
            .query("nodes")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        // Calculate position: place new nodes in a grid, offset from existing ones
        const nodeIndex = existingNodes.length;
        const position = {
            x: 300 + ((nodeIndex % 5) * 250), // 5 nodes per row
            y: 100 + (Math.floor(nodeIndex / 5) * 200), // New row every 5 nodes
        };

        const nodeId = await ctx.db.insert("nodes", {
            projectId: args.projectId,
            type: "generatingAsset",
            position,
            data: {
                name: args.name,
                expectedType: args.expectedType,
                generationModel: args.generationModel,
                generationPrompt: args.generationPrompt,
                generationParams: args.generationParams,
                status: "generating", // loading state
                createdAt: Date.now(),
            },
        });

        return nodeId;
    },
});

// Update a generating node when generation completes
export const updateGeneratingNodeToAsset = mutation({
    args: {
        nodeId: v.id("nodes"),
        assetId: v.id("assets"),
        assetUrl: v.string(),
        assetMetadata: v.any(),
    },
    handler: async (ctx, args) => {
        const node = await ctx.db.get(args.nodeId);
        if (!node || node.type !== "generatingAsset") {
            throw new Error("Node not found or not a generating asset");
        }

        // Determine final node type based on the asset
        const expectedType = node.data.expectedType;
        const finalNodeType = expectedType === "video" ? "videoAsset" :
            expectedType === "audio" ? "imageAsset" : // Audio nodes display as images for now
                "imageAsset";

        // Update the node to become a real asset node
        await ctx.db.patch(args.nodeId, {
            type: finalNodeType,
            data: {
                assetId: args.assetId,
                name: node.data.name,
                url: args.assetUrl,
                metadata: args.assetMetadata,
                // Keep generation metadata for reference
                generationPrompt: node.data.generationPrompt,
                generationModel: node.data.generationModel,
                generationParams: node.data.generationParams,
            },
        });
    },
});

// Get all nodes for a project
export const listByProject = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, { projectId }) => {
        const nodes = await ctx.db
            .query("nodes")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .collect();
        return nodes;
    },
});

// Get a specific node
export const get = query({
    args: {
        id: v.id("nodes"),
    },
    handler: async (ctx, { id }) => {
        return await ctx.db.get(id);
    },
});

// Update node position
export const updatePosition = mutation({
    args: {
        id: v.id("nodes"),
        position: v.object({
            x: v.number(),
            y: v.number(),
        }),
    },
    handler: async (ctx, { id, position }) => {
        await ctx.db.patch(id, { position });
    },
});

// Update node data
export const updateData = mutation({
    args: {
        id: v.id("nodes"),
        data: v.any(),
    },
    handler: async (ctx, { id, data }) => {
        await ctx.db.patch(id, { data });
    },
});

// Delete a node and all its connected edges
export const remove = mutation({
    args: {
        id: v.id("nodes"),
    },
    handler: async (ctx, { id }) => {
        // Remove all edges connected to this node first
        await ctx.runMutation(api.edges.removeAllForNode, {
            nodeId: id,
        });

        // Then remove the node itself
        await ctx.db.delete(id);
    },
});

// Create a draft node (specific helper for AI tools)
export const createDraftNode = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.string(),
        description: v.optional(v.string()),
        estimatedDuration: v.optional(v.number()),
        jsonPrompt: v.optional(v.any()),
        position: v.optional(v.object({
            x: v.number(),
            y: v.number(),
        })),
    },
    returns: v.id("nodes"),
    handler: async (ctx, { projectId, title, description, estimatedDuration, jsonPrompt, position }) => {
        // Get existing nodes to calculate position
        const existingNodes = await ctx.db
            .query("nodes")
            .withIndex("by_project", (q) => q.eq("projectId", projectId))
            .collect();

        // Auto-position if not provided - spread nodes horizontally
        const defaultPosition = position || {
            x: 400 + (existingNodes.filter(n => n.type === 'draft').length * 220),
            y: 300,
        };

        const nodeId = await ctx.db.insert("nodes", {
            projectId,
            type: "draft",
            position: defaultPosition,
            data: {
                title,
                description,
                estimatedDuration,
                jsonPrompt,
            },
        });

        return nodeId;
    },
}); 