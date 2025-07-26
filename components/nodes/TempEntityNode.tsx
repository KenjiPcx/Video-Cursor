import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { HelpCircle, Target, Package, Calendar } from 'lucide-react';

export type TempEntityNode = Node<{
    name: string;
    description: string;
    type: "goal" | "project" | "event";
    similarityScores?: {
        goals: Array<{ id: string; score: number }>;
        projects: Array<{ id: string; score: number }>;
    };
}, "tempEntity">;

export default function TempEntityNode({ data }: NodeProps<TempEntityNode>) {
    const [isHovered, setIsHovered] = useState(false);

    const getIcon = () => {
        switch (data.type) {
            case 'goal':
                return <Target className="w-4 h-4 text-orange-200" />;
            case 'project':
                return <Package className="w-4 h-4 text-orange-200" />;
            case 'event':
                return <Calendar className="w-4 h-4 text-orange-200" />;
            default:
                return <HelpCircle className="w-4 h-4 text-orange-200" />;
        }
    };

    const getTypeColor = () => {
        switch (data.type) {
            case 'goal':
                return 'text-green-300';
            case 'project':
                return 'text-blue-300';
            case 'event':
                return 'text-purple-300';
            default:
                return 'text-gray-300';
        }
    };

    const topSimilarity = data.similarityScores ?
        Math.max(
            ...data.similarityScores.goals.map(g => g.score),
            ...data.similarityScores.projects.map(p => p.score)
        ) : 0;

    // Dot view (default)
    if (!isHovered) {
        return (
            <div
                className="relative flex items-center justify-center w-8 h-8 cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                title={`Considering ${data.type}: ${data.name}`}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-1 h-1 bg-transparent border-0 opacity-0"
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    className="w-1 h-1 bg-transparent border-0 opacity-0"
                />
                {/* Visual dot - smaller than hover area */}
                <div className="w-4 h-4 bg-orange-500 border-2 border-orange-400 border-dashed rounded-full shadow-lg opacity-90 transition-all duration-200 hover:scale-125 hover:shadow-xl">
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                {/* Question mark indicator for temporary nature */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 border border-yellow-300 rounded-full flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-gray-800 rounded-full" />
                </div>
            </div>
        );
    }

    // Expanded view (on hover)
    return (
        <div
            className="bg-orange-600 border-2 border-orange-400 border-dashed rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg opacity-90 transition-all duration-200 transform scale-100 z-10"
            onMouseLeave={() => setIsHovered(false)}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="w-1 h-1 bg-transparent border-0 opacity-0"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-1 h-1 bg-transparent border-0 opacity-0"
            />

            <div className="flex items-center gap-2 mb-2">
                {getIcon()}
                <span className="text-white font-semibold text-sm">
                    Considering {data.type}
                </span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className="text-orange-100 text-xs leading-relaxed mb-2">
                {data.description.length > 80
                    ? `${data.description.substring(0, 80)}...`
                    : data.description
                }
            </p>

            {topSimilarity > 0 && (
                <div className="mt-2">
                    <div className="text-xs text-orange-200 mb-1">
                        Similarity to existing items:
                    </div>
                    <div className="w-full bg-orange-800 rounded-full h-2">
                        <div
                            className="bg-orange-300 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${topSimilarity * 100}%` }}
                        />
                    </div>
                    <div className="text-xs text-orange-200 mt-1">
                        {Math.round(topSimilarity * 100)}% match
                    </div>
                </div>
            )}
        </div>
    );
} 