"use client"

import React, { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Package } from 'lucide-react';

export type ProjectNode = Node<
    {
        name: string;
        description: string;
        status?: string;
        completed?: boolean;
    },
    "project"
>;

export default function ProjectNode({ data }: NodeProps<ProjectNode>) {
    const [isHovered, setIsHovered] = useState(false);
    const isCompleted = data.completed;

    // Get colors based on status
    const getProjectColors = () => {
        if (isCompleted || data.status === 'completed') {
            return {
                bg: 'bg-emerald-600',
                border: 'border-emerald-500',
                dot: 'bg-emerald-500',
                dotBorder: 'border-emerald-400'
            };
        }

        switch (data.status) {
            case 'in-progress':
                return {
                    bg: 'bg-blue-600',
                    border: 'border-blue-500',
                    dot: 'bg-blue-500',
                    dotBorder: 'border-blue-400'
                };
            case 'planning':
                return {
                    bg: 'bg-sky-600',
                    border: 'border-sky-500',
                    dot: 'bg-sky-500',
                    dotBorder: 'border-sky-400'
                };
            default:
                return {
                    bg: 'bg-blue-600',
                    border: 'border-blue-500',
                    dot: 'bg-blue-500',
                    dotBorder: 'border-blue-400'
                };
        }
    };

    const colors = getProjectColors();

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
                <div className={`w-4 h-4 ${colors.dot} border-2 ${colors.dotBorder} rounded-full shadow-lg transition-all duration-200 hover:scale-125 hover:shadow-xl`}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                {/* Completion indicator */}
                {(isCompleted || data.status === 'completed') && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 border border-green-400 rounded-full flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                )}
            </div>
        );
    }

    // Expanded view (on hover)
    return (
        <div
            className={`${colors.bg} border-2 ${colors.border} rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg transition-all duration-200 transform scale-100 z-10`}
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
                <Package className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">Project</span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className="text-white text-opacity-90 text-xs leading-relaxed">
                {data.description.length > 100
                    ? `${data.description.substring(0, 100)}...`
                    : data.description
                }
            </p>

            <div className="mt-2 flex items-center gap-2">
                {data.status && (
                    <span className={`text-xs px-2 py-1 rounded-full ${data.status === 'completed' || isCompleted
                            ? 'bg-emerald-800 text-emerald-200'
                            : data.status === 'in-progress'
                                ? 'bg-blue-800 text-blue-200'
                                : data.status === 'planning'
                                    ? 'bg-sky-800 text-sky-200'
                                    : 'bg-gray-600 text-gray-200'
                        }`}>
                        {data.status}
                    </span>
                )}

                {(isCompleted || data.status === 'completed') && (
                    <span className="text-xs px-2 py-1 bg-green-700 text-green-100 rounded-full">
                        ✓ Done
                    </span>
                )}
            </div>
        </div>
    );
} 