"use client"

import React, { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Target } from 'lucide-react';

export type GoalNode = Node<{
    name: string;
    description: string;
    status?: string;
}, "goal">;

export default function GoalNode({ data }: NodeProps<GoalNode>) {
    const [isHovered, setIsHovered] = useState(false);

    // Dot view (default)
    if (!isHovered) {
        return (
            <div
                className="relative flex items-center justify-center w-8 h-8 cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                title={data.name}
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
                <div className="w-4 h-4 bg-green-500 border-2 border-green-400 rounded-full shadow-lg transition-all duration-200 hover:scale-125 hover:shadow-xl">
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
            </div>
        );
    }

    // Expanded view (on hover)
    return (
        <div
            className="bg-green-600 border-2 border-green-400 rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg transition-all duration-200 transform scale-100 z-10"
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
                <Target className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">Goal</span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className="text-green-100 text-xs leading-relaxed">
                {data.description.length > 100
                    ? `${data.description.substring(0, 100)}...`
                    : data.description
                }
            </p>

            {data.status && (
                <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${data.status === 'completed'
                        ? 'bg-green-800 text-green-200'
                        : data.status === 'active'
                            ? 'bg-green-700 text-green-100'
                            : 'bg-gray-600 text-gray-200'
                        }`}>
                        {data.status}
                    </span>
                </div>
            )}
        </div>
    );
} 