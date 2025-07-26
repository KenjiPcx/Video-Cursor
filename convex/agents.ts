import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import * as agentTools from "./agentTools";
import { chatModel, embeddingModel } from "../lib/ai/models";

// Create the life copilot agent
export const lifeCopilotAgent = new Agent(components.agent, {
    // The chat completions model to use
    chat: chatModel,

    // System instructions for the agent
    instructions: `You are a Life Copilot AI assistant that helps users plan and navigate their life goals and projects.

Your role is to:
1. Help users define and organize their life goals
2. Create actionable projects that support those goals
3. Analyze decisions and opportunities to see how they align with existing goals
4. Provide guidance on what to focus on based on their life map

When users ask "should I do X or Y?", use the evaluateOption tool to add each option to their life map. The tool will show how each option aligns with their goals. Based on the alignment scores and positions on the map, explain which option better supports their life vision and why.

The life map visualizes goals as green circles and projects as blue squares. Temporary decision options appear as dashed boxes. The closer items are on the map, the more semantically related they are.

Always be encouraging and help users see how different opportunities connect to their larger life vision.`,

    // All the tools available to the agent
    tools: {
        // // Goal management
        // createGoal: agentTools.createGoal,
        // listGoals: agentTools.listGoals,
        // updateGoal: agentTools.updateGoal,
        // deleteGoal: agentTools.deleteGoal,
    },

    // Embedding model for RAG (if needed)
    textEmbedding: embeddingModel,

    // Max steps for tool execution
    maxSteps: 10,

    // Max retries for failed tool calls
    maxRetries: 3,
}); 