import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Goal Tools
// export const createGoal = createTool({
//     description: "Create a new life goal for the user",
//     args: z.object({
//         name: z.string().describe("The name of the goal"),
//         description: z.string().describe("A detailed description of what the goal entails"),
//     }),
//     handler: async (ctx, args): Promise<{ goalId: string; message: string }> => {
//         const goalId = await ctx.runMutation(api.goals.create, {
//             name: args.name,
//             description: args.description,
//         });

//         // Add embedding to the goal
//         await ctx.runAction(internal.goals.generateEmbeddingForGoal, {
//             goalId: goalId as Id<"goals">,
//         });

//         return {
//             goalId,
//             message: `Created goal "${args.name}". I'll calculate its position in your life map based on its description.`,
//         };
//     },
// });
