import { v } from "convex/values";
import { mutation, httpAction, internalAction, query, action } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { lifeCopilotAgent } from "./agents";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent";

// Create a new thread
export const createThread = mutation({
    args: {},
    returns: v.object({ threadId: v.string() }),
    handler: async (ctx): Promise<{ threadId: string }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Create thread with user association
        const { threadId } = await lifeCopilotAgent.createThread(ctx, {
            userId: userId,
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

// Send a message and get streaming response  
export const chat = httpAction(async (ctx, request) => {
    const { message, threadId } = await request.json();

    console.log({ message, threadId });

    // Continue the thread with the agent
    const { thread } = await lifeCopilotAgent.continueThread(ctx, {
        threadId,
    });

    // Stream the response
    const result = await thread.streamText({
        messages: [message],
        maxSteps: 10,
    });

    const response = result.toDataStreamResponse();
    response.headers.set("Message-Id", result.messageId);
    return response;
});

export const deleteThread = action({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
        // Delete the thread and all its messages
        await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, { threadId });
        return { success: true };
    },
});

export const sendMessageHttpStream = httpAction(async (ctx, request) => {
    console.log("Sending message", request);    
    const {
        message,
        id: threadId,
    } = await request.json();

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // TODO: Add tools to plan and schedule a handoff
    const { thread } = await lifeCopilotAgent.continueThread(ctx, {
        threadId,
        userId,
    });

    const result = await thread.streamText({ messages: [message] });

    const response = result.toDataStreamResponse();
    response.headers.set("Message-Id", result.messageId);
    return response;
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
        const streams = await lifeCopilotAgent.syncStreams(ctx, { threadId, streamArgs });
        // Here you could filter out / modify the stream of deltas / filter out
        // deltas.

        const paginated = await lifeCopilotAgent.listMessages(ctx, {
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