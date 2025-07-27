import React, { useState, ReactNode } from 'react';
import { NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';

interface NodeWrapperProps {
    children: ReactNode;
    node: NodeProps;
    onDelete?: (nodeId: string) => void;
    isDeletable?: boolean;
}

export function NodeWrapper({
    children,
    node,
    onDelete,
    isDeletable = true
}: NodeWrapperProps) {
    const [isHovered, setIsHovered] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(node.id);
    };

    // Don't allow deletion of starting nodes
    const canDelete = isDeletable && node.type !== 'starting';

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}

            {/* Delete button on hover */}
            {isHovered && canDelete && (
                <button
                    onClick={handleDelete}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 z-50"
                    style={{ pointerEvents: 'all' }}
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
} 