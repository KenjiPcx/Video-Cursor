"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { embed } from "ai";
import { embeddingModel } from "../lib/ai/models";

// Generate embedding for a text description
export const generateEmbedding = internalAction({
    args: {
        text: v.string(),
    },
    handler: async (ctx, args): Promise<number[]> => {
        const { embedding } = await embed({
            model: embeddingModel,
            value: args.text,
        });

        return embedding;
    },
});

// Calculate 2D coordinates from high-dimensional embeddings using random projection
// This provides better results than the previous approach and handles small embedding values properly
export const calculateCoordinates = internalAction({
    args: {
        embeddings: v.array(v.object({
            id: v.string(),
            embedding: v.array(v.number()),
        })),
        newEmbedding: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args): Promise<{ coordinates: { id: string; x: number; y: number }[]; newCoordinates?: { id: string; x: number; y: number } }> => {
        const allEmbeddings = [...args.embeddings];

        if (args.newEmbedding) {
            allEmbeddings.push({
                id: "new",
                embedding: args.newEmbedding,
            });
        }

        if (allEmbeddings.length === 0) {
            return { coordinates: [] };
        }

        const embeddingDim = allEmbeddings[0].embedding.length;

        // Create a deterministic random projection matrix
        // Using a seed based on the first embedding to ensure consistency
        const seed = allEmbeddings[0].embedding.slice(0, 4).reduce((sum, val) => sum + val, 0);
        const rng = createSeededRandom(seed);

        // Random projection matrix (2 x embeddingDim)
        const projectionMatrix = [
            Array.from({ length: embeddingDim }, () => rng() * 2 - 1), // x projection
            Array.from({ length: embeddingDim }, () => rng() * 2 - 1), // y projection
        ];

        // Calculate mean for centering
        const mean = new Array(embeddingDim).fill(0);
        for (const item of allEmbeddings) {
            for (let i = 0; i < embeddingDim; i++) {
                mean[i] += item.embedding[i];
            }
        }
        for (let i = 0; i < embeddingDim; i++) {
            mean[i] /= allEmbeddings.length;
        }

        // Project embeddings to 2D
        const coordinates = allEmbeddings.map((item) => {
            // Center the embedding
            const centered = item.embedding.map((val, i) => val - mean[i]);

            // Project to 2D using random projection
            const x = centered.reduce((sum, val, i) => sum + val * projectionMatrix[0][i], 0);
            const y = centered.reduce((sum, val, i) => sum + val * projectionMatrix[1][i], 0);

            // Scale up and bound coordinates for better visualization
            const scaleFactor = 1000; // Scale up since embeddings are small
            const scaledX = x * scaleFactor;
            const scaledY = y * scaleFactor;

            return {
                id: item.id,
                x: Math.max(-10000, Math.min(10000, scaledX)),
                y: Math.max(-10000, Math.min(10000, scaledY)),
            };
        });

        const result: any = {
            coordinates: coordinates.filter(c => c.id !== "new"),
        };

        if (args.newEmbedding) {
            result.newCoordinates = coordinates.find(c => c.id === "new");
        }

        return result;
    },
});

// Simple seeded random number generator for deterministic results
function createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

// Calculate similarity scores between embeddings
export const calculateSimilarity = internalAction({
    args: {
        embedding1: v.array(v.number()),
        embedding2: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        // Cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < args.embedding1.length; i++) {
            dotProduct += args.embedding1[i] * args.embedding2[i];
            norm1 += args.embedding1[i] * args.embedding1[i];
            norm2 += args.embedding2[i] * args.embedding2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
}); 