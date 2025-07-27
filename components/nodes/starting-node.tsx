import React from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Play } from 'lucide-react';

export interface StartingNode extends Node {
    type: 'starting';
    data: {
        label: string;
    };
}

export default function StartingNode({ data }: { data: StartingNode['data'] }) {
    return (
        <div className="bg-green-600 border-2 border-green-500 rounded-lg p-3 shadow-lg min-w-[120px]">
            <div className="flex items-center gap-2 text-white">
                <Play className="h-4 w-4" />
                <span className="text-sm font-semibold">{data.label}</span>
            </div>

            {/* Output handle for connecting to other nodes */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-green-400 !border-green-300 !w-3 !h-3"
            />
        </div>
    );
} 