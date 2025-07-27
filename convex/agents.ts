import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { chatModel, embeddingModel } from "../lib/ai/models";

// Create the video editing copilot agent
export const videoEditingAgent = new Agent(components.agent, {
    // The chat completions model to use
    chat: chatModel,

    // System instructions for the agent
    instructions: `You are a Video Cursor AI assistant that helps users create and edit videos.

Your role is to:
1. Help users brainstorm and plan video concepts
2. Create detailed scene descriptions for video production
3. Assist with video editing workflows and timelines
4. Provide creative direction and technical guidance

When users want to plan a video, use the createDraftScene tool to add scene nodes to their video editor. Be very detailed and cinematic in your scene descriptions.

Always be creative and help users visualize their video concepts through detailed, professional scene descriptions.`,

    // All the tools will be injected in runtime as they have some runtime params
    tools: {

    },

    // Embedding model for RAG (if needed)
    textEmbedding: embeddingModel,

    // Max steps for tool execution
    maxSteps: 10,

    // Max retries for failed tool calls
    maxRetries: 3,
}); 