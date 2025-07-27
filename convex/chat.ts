import { v } from "convex/values";
import { mutation, httpAction, query, action, internalMutation } from "./_generated/server";
import { api, components } from "./_generated/api";
import { videoEditingAgent } from "./agents";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { createTool, vStreamArgs } from "@convex-dev/agent";
import { Attachment, UIMessage } from "ai";
import { vAttachment } from "./validators";
import { Doc, Id } from "./_generated/dataModel";
import dedent from "dedent";
import { createDraftScene, ToolCtx } from "./agentTools";
import { z } from "zod";

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
    message: UIMessage,
    threadId: string,
    projectId: string,
    attachments: Array<Attachment>,
    timelineData: Doc<"projects">["timelineData"]
}

// Send a message and get streaming response  
export const chat = httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { message, threadId, projectId, attachments, timelineData } = await request.json() as ChatRequest;

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
        - The actual timeline itself of the entire video:
        ${JSON.stringify(timelineData)}
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
        messages: [{
            role: "user",
            content: convertAttachmentsToContent(attachments, message.content)
        }],
        maxSteps: 20,
        tools: {
            createDraftScene: createDraftScene(toolProps),
        },
        toolCallStreaming: true,
        toolChoice: "auto",
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