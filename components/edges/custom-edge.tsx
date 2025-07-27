import React, { useState } from 'react';
import {
    getBezierPath,
    EdgeProps,
    BaseEdge,
} from '@xyflow/react';

interface CustomEdgeProps extends EdgeProps {
    onDelete?: (edgeId: string) => void;
}

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    onDelete,
}: CustomEdgeProps) {
    const [isHovered, setIsHovered] = useState(false);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('🎯 Edge delete button clicked, edgeId:', id);
        onDelete?.(id);
    };

    const handleMouseEnter = () => {
        console.log('🐭 Edge hover ENTER, edgeId:', id);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        console.log('🐭 Edge hover LEAVE, edgeId:', id);
        setIsHovered(false);
    };

    return (
        <g>
            {/* Invisible wide stroke for reliable hover detection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            />

            {/* Visible edge */}
            <BaseEdge
                path={edgePath}
                style={{
                    ...style,
                    strokeWidth: isHovered ? 3 : 2,
                    stroke: isHovered ? '#3b82f6' : '#6b7280',
                }}
            />

            {/* Delete button when hovered */}
            {isHovered && (
                <g transform={`translate(${labelX}, ${labelY})`}>
                    <circle
                        r="12"
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-red-600"
                        onClick={handleDelete}
                    />
                    <path
                        d="M8 8L16 16M16 8L8 16"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        transform="translate(-8, -8)"
                        className="pointer-events-none"
                    />
                </g>
            )}
        </g>
    );
} 