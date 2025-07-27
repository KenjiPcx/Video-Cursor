import React, { useState, useEffect } from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Clock, Sparkles, Loader2 } from 'lucide-react';

export interface GeneratingNode extends Node {
    type: 'generatingAsset';
    data: {
        name: string;
        expectedType: 'video' | 'audio' | 'image';
        generationModel: string;
        generationPrompt: string;
        generationParams: any;
        status: 'generating';
        createdAt: number;
    };
}

export default function GeneratingNode({ data, selected }: { data: GeneratingNode['data']; selected?: boolean }) {
    const [timeRemaining, setTimeRemaining] = useState(60); // Start with 60 seconds
    const [isExpired, setIsExpired] = useState(false);

    // Calculate elapsed time and remaining time
    useEffect(() => {
        const startTime = data.createdAt;
        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, 60 - elapsed);

            setTimeRemaining(remaining);
            setIsExpired(remaining === 0);
        };

        // Update immediately
        updateTimer();

        // Update every second
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [data.createdAt]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get icon and color based on expected type
    const getTypeInfo = () => {
        switch (data.expectedType) {
            case 'video':
                return { icon: Sparkles, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50' };
            case 'image':
                return { icon: Sparkles, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' };
            case 'audio':
                return { icon: Sparkles, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50' };
            default:
                return { icon: Sparkles, color: 'text-zinc-400', bgColor: 'bg-zinc-500/20', borderColor: 'border-zinc-500/50' };
        }
    };

    const { icon: TypeIcon, color, bgColor, borderColor } = getTypeInfo();

    return (
        <div className={`bg-zinc-800 border-2 ${isExpired ? 'border-yellow-500/50' : borderColor} ${selected ? 'ring-2 ring-zinc-400' : ''} rounded-lg p-3 shadow-lg min-w-[200px] max-w-[240px] ${bgColor}`}>
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-zinc-500 !border-zinc-400 !w-3 !h-3"
            />

            <div className="text-white space-y-3">
                {/* Header with spinning icon */}
                <div className="flex items-center gap-2">
                    {isExpired ? (
                        <Clock className={`h-4 w-4 ${color}`} />
                    ) : (
                        <Loader2 className={`h-4 w-4 ${color} animate-spin`} />
                    )}
                    <span className="text-sm font-semibold truncate">{data.name}</span>
                </div>

                {/* Status and type */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <TypeIcon className={`h-3 w-3 ${color}`} />
                        <span className="text-xs text-zinc-300 capitalize">{data.expectedType}</span>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${bgColor} ${color} border ${borderColor}`}>
                        {isExpired ? 'Processing...' : 'Generating'}
                    </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-zinc-400" />
                    <div className={`text-sm font-mono ${isExpired ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {isExpired ? 'Taking longer than expected...' : formatTime(timeRemaining)}
                    </div>
                </div>

                {/* Model info */}
                <div className="text-xs text-zinc-400 truncate">
                    <span className="font-medium">Model:</span> {data.generationModel.split('/').pop()}
                </div>

                {/* Progress bar animation */}
                <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full ${isExpired ? 'bg-yellow-500' : color.replace('text-', 'bg-')} transition-all duration-1000 ease-linear`}
                        style={{
                            width: isExpired ? '100%' : `${((60 - timeRemaining) / 60) * 100}%`,
                            animation: isExpired ? 'pulse 2s infinite' : 'none'
                        }}
                    />
                </div>

                {/* Prompt preview */}
                {data.generationPrompt && (
                    <div className="text-xs text-zinc-400 line-clamp-2 italic">
                        "{data.generationPrompt}"
                    </div>
                )}
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-zinc-500 !border-zinc-400 !w-3 !h-3"
            />
        </div>
    );
} 