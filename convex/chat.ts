import { v } from "convex/values";
import { mutation, httpAction, query, action, internalMutation, ActionCtx } from "./_generated/server";
import { api, components } from "./_generated/api";
import { videoEditingAgent } from "./agents";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { createTool, vStreamArgs } from "@convex-dev/agent";
import { Attachment, UIMessage } from "ai";
import { vAttachment } from "./validators";
import { Doc, Id } from "./_generated/dataModel";
import dedent from "dedent";
import { createDraftScene, generateImageWithRunway, generateCharacterControlVideo, generateVideoWithHailuo, generateVoiceNarration, generateImageWithFlux, searchVoiceModels, applyCompositionFilter, placeAssetOnTimeline, modifyTimelineAsset, extractInterestingSegments, splitVideoAsset, removeBackground, ToolCtx, reorderTimelineAssets, linkNodes, unlinkNodes, unlinkAllFromNode } from "./agentTools";

// Create a new thread
export const createThread = mutation({
    args: {
        projectId: v.id("projects"),
    },
    returns: v.object({ threadId: v.string() }),
    handler: async (ctx, { projectId }): Promise<{ threadId: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Create thread with user association
        const { threadId } = await videoEditingAgent.createThread(ctx, {
            userId: userId,
        });

        // Link thread to project
        await ctx.runMutation(api.threadMetadata.linkThreadToProject, {
            projectId,
            threadId,
            title: "New Thread"
        });

        return { threadId };
    },
});

export const getLatestThread = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, { userId });
        if (threads.page.length === 0) {
            return undefined;
        }
        return threads.page[0]._id;
    },
});

// Utility function to convert attachments schema to content format
export const convertAttachmentsToContent = (
    attachments: Attachment[] | undefined,
    prompt: string | undefined
): Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType?: string }
    | { type: "file"; data: string; filename?: string; mimeType: string }
> => {
    const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: string; mimeType?: string }
        | { type: "file"; data: string; filename?: string; mimeType: string }
    > = [];

    // Add attachments first
    if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
            // Check if it's an image based on contentType
            if (attachment.contentType?.startsWith('image/')) {
                content.push({
                    type: "image",
                    image: attachment.url,
                    mimeType: attachment.contentType,
                });
            } else if (attachment.contentType) {
                // For non-image files, add them as file attachments
                content.push({
                    type: "file",
                    data: attachment.url,
                    filename: attachment.name,
                    mimeType: attachment.contentType,
                });
            }
            // For attachments without contentType, skip or add as text reference
        }
    }

    // Add the text prompt
    if (prompt) {
        content.push({
            type: "text",
            text: prompt,
        });
    }

    return content;
}

type ChatRequest = {
    messages: UIMessage[],
    threadId: string,
    projectId: string,
    attachments: Array<Attachment>
}

// Helper function to derive timeline path from nodes and edges (for display purposes)
function deriveTimelinePath(nodes: Doc<"nodes">[], edges: Doc<"edges">[]): Doc<"nodes">[] {
    // Find the starting node
    const startingNode = nodes.find(node => node.type === "starting");
    if (!startingNode) return [];

    // Build adjacency map from edges
    const adjacencyMap = new Map<string, string[]>();
    edges.forEach(edge => {
        if (!adjacencyMap.has(edge.sourceNodeId)) {
            adjacencyMap.set(edge.sourceNodeId, []);
        }
        adjacencyMap.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    });

    // Follow the path from starting node
    const path: Doc<"nodes">[] = [startingNode];
    const visited = new Set<string>([startingNode._id]);
    let currentNodeId = startingNode._id;

    while (true) {
        const nextNodeIds = adjacencyMap.get(currentNodeId) || [];
        const unvisitedNext = nextNodeIds.find(id => !visited.has(id));

        if (!unvisitedNext) break;

        const nextNode = nodes.find(node => node._id === unvisitedNext);
        if (!nextNode) break;

        path.push(nextNode);
        visited.add(nextNode._id);
        currentNodeId = nextNode._id;
    }

    return path;
}

// Helper function to gather all editor context for the AI
async function gatherEditorContext(ctx: ActionCtx, projectId: string) {
    const projectIdTyped = projectId as Id<"projects">;

    // Gather all editor data - removed broken getTimelinePath query
    const [nodes, edges, assets, project] = await Promise.all([
        ctx.runQuery(api.nodes.listByProject, { projectId: projectIdTyped }),
        ctx.runQuery(api.edges.listByProject, { projectId: projectIdTyped }),
        ctx.runQuery(api.assets.listByProject, { projectId: projectIdTyped }),
        ctx.runQuery(api.projects.get, { id: projectIdTyped })
    ]);

    // Derive timeline path locally from nodes and edges (for display only)
    const timelinePath = deriveTimelinePath(nodes, edges);

    // Get timeline data from project (this now includes both graph-derived and AI-placed assets)
    const timelineData = project?.timelineData;

    // Format nodes
    const nodesText = nodes.map((node: Doc<"nodes">) => {
        const position = `(${node.position.x}, ${node.position.y})`;
        const title = node.data?.title || node.data?.name || `${node.type} node`;
        const description = node.data?.description ? ` | Description: "${node.data.description}"` : '';
        const assetId = node.data?.assetId ? ` | Asset: ${node.data.assetId}` : '';
        const url = node.data?.assetUrl ? ` | URL: ${node.data.assetUrl}` : '';
        return `  - ID: ${node._id} | Type: ${node.type} | Position: ${position} | Title: "${title}"${description}${assetId}${url}`;
    }).join('\n');

    // Format edges
    const edgesText = edges.map(edge =>
        `  - ${edge.sourceNodeId} → ${edge.targetNodeId}`
    ).join('\n');

    // Format timeline path (main story flow) - now using derived path
    const timelinePathText = timelinePath.map((node, index) => {
        const title = node.data?.title || node.data?.name || `${node.type} node`;
        return `  ${index + 1}. ${title} (${node.type})`;
    }).join('\n');

    // Format assets
    const assetsText = assets.map(asset => {
        const duration = asset.metadata?.duration ? ` | Duration: ${Math.round(asset.metadata.duration)}s` : '';
        const dimensions = asset.metadata?.width && asset.metadata.height ?
            ` | Size: ${asset.metadata.width}x${asset.metadata.height}` : '';
        const description = asset.description ? ` | Description: "${asset.description}"` : '';
        const trimInfo = asset.metadata?.trimStart !== undefined ?
            ` | Trimmed: ${asset.metadata.trimStart}s-${asset.metadata.trimEnd}s` : '';
        const url = asset.url ? ` | URL: ${asset.url}` : '';
        return `  - ID: ${asset._id} | Type: ${asset.type} | Name: "${asset.name}"${duration}${dimensions}${description}${trimInfo}${url}`;
    }).join('\n');

    return `
=== EDITOR CONTEXT ===

CANVAS NODES (${nodes.length} total):
${nodesText || '  (No nodes)'}

NODE CONNECTIONS (${edges.length} total):
${edgesText || '  (No connections)'}

MAIN TIMELINE PATH (Story Flow):
${timelinePathText || '  (No connected path)'}

PROJECT ASSETS (${assets.length} total):
${assetsText || '  (No assets)'}

CURRENT TIMELINE STATE (Source of Truth):
${timelineData ? JSON.stringify(timelineData, null, 2) : '  (No timeline data - empty project)'}
`;
}

// Send a message and get streaming response  
export const chat = httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { messages, threadId, projectId, attachments } = await request.json() as ChatRequest;

    // Gather complete editor context
    const editorContext = await gatherEditorContext(ctx, projectId);

    // Continue the thread with the agent
    const { thread } = await videoEditingAgent.continueThread(ctx, {
        threadId,
        userId
    });

    const systemPrompt = dedent`
        # Role
        You are a Video Cursor AI assistant that helps users create and edit videos.
        
        # Instructions
        Use the tools to fulfill the user's request.

        # Tools
        You are given access to tools that help you edit and stitch video.
        - editVideo: Edit the video.
        - stitchVideo: Stitch the video.

        # Timeline
        - The assets are arranged in a timeline just like a normal video editor, you have array of timelines which could be audio or video or text.
        - Each timeline has a list of assets, each asset has a start and end time relative to the overall timeline and also a start and end time relative to the assets themselves.
        - The timeline with the highest index has the highest z index
        
        # Context
        You are given the following context:
        - Current Project ID: ${projectId}
        - Assets uploaded and a description of the assets or with their summary:
        ${JSON.stringify(attachments)}
        
        ${editorContext}
        
        - The user's message below

        Using these context, you should comply with the user's request.
    `

    const toolProps: ToolCtx = {
        ctx,
        threadId,
        userId,
        projectId: projectId as Id<"projects">,
    }

    // Stream the response
    const result = await thread.streamText({
        system: systemPrompt,
        messages: messages,
        maxSteps: 20,
        tools: {
            createDraftScene: createDraftScene(toolProps),
            generateImageWithRunway: generateImageWithRunway(toolProps),
            generateCharacterControlVideo: generateCharacterControlVideo(toolProps),
            generateVideoWithHailuo: generateVideoWithHailuo(toolProps),
            generateVoiceNarration: generateVoiceNarration(toolProps),
            generateImageWithFlux: generateImageWithFlux(toolProps),
            searchVoiceModels: searchVoiceModels(toolProps),
            applyCompositionFilter: applyCompositionFilter(toolProps),
            placeAssetOnTimeline: placeAssetOnTimeline(toolProps),
            modifyTimelineAsset: modifyTimelineAsset(toolProps),
            extractInterestingSegments: extractInterestingSegments(toolProps),
            splitVideoAsset: splitVideoAsset(toolProps),
            removeBackground: removeBackground(toolProps),
            reorderTimelineAssets: reorderTimelineAssets(toolProps),
            linkNodes: linkNodes(toolProps),
            unlinkNodes: unlinkNodes(toolProps),
            unlinkAllFromNode: unlinkAllFromNode(toolProps),
        },
        toolCallStreaming: true,
        toolChoice: "auto",
    }, {
        contextOptions: {
            excludeToolMessages: true,
            searchOtherThreads: true,
            recentMessages: 100,
        }
    });

    const response = result.toDataStreamResponse();
    response.headers.set("Message-Id", result.messageId);
    return response;
});


export const saveAttachmentsToProjectContext = internalMutation({
    args: {
        projectId: v.id("projects"),
        attachments: v.array(vAttachment),
    },
    handler: async (ctx, { projectId, attachments }) => {
        const project = await ctx.db.get(projectId);
        if (!project) throw new Error("Project not found");

        const newAttachments = [...(project.context?.attachments || []), ...attachments];
        await ctx.db.patch(projectId, { context: { attachments: newAttachments } });
    },
});


export const deleteThread = action({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
        // Delete the thread and all its messages
        await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, { threadId });
        return { success: true };
    },
});

/**
 * Query & subscribe to messages & threads
 */
export const listThreadMessages = query({
    args: {
        // These arguments are required:
        threadId: v.string(),
        paginationOpts: paginationOptsValidator, // Used to paginate the messages.
        streamArgs: vStreamArgs, // Used to stream messages.
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const { threadId, paginationOpts, streamArgs } = args;
        const streams = await videoEditingAgent.syncStreams(ctx, { threadId, streamArgs });
        // Here you could filter out / modify the stream of deltas / filter out
        // deltas.

        const paginated = await videoEditingAgent.listMessages(ctx, {
            threadId,
            paginationOpts,
        });
        // Here you could filter out metadata that you don't want from any optional
        // fields on the messages.
        // You can also join data onto the messages. They need only extend the
        // MessageDoc type.
        // { ...messages, page: messages.page.map(...)}

        return {
            ...paginated,
            streams,
            // ... you can return other metadata here too.
            // note: this function will be called with various permutations of delta
            // and message args, so returning derived data .
        };
    },
});


export const getMessages = query({
    args: { threadId: v.string(), paginationOpts: paginationOptsValidator },
    handler: async (ctx, { threadId, paginationOpts }) => {

        const messages = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
            threadId,
            paginationOpts,
            excludeToolMessages: false,
            order: "asc",
        });
        return messages;

    },
});

export const getInProgressMessages = query({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
        const { page } = await ctx.runQuery(
            components.agent.messages.listMessagesByThreadId,
            {
                threadId, statuses: ["pending"],
                order: "asc",
            },
        );
        return page;
    },
});

export const getThreads = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, { userId });
        return threads;
    },
}); 