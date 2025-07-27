import React from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Image, Info } from 'lucide-react';

export interface ImageAssetNode extends Node {
    type: 'imageAsset';
    data: {
        assetId: string;
        name: string;
        url: string;
        onDetailsClick?: () => void;
        metadata?: {
            width?: number;
            height?: number;
            mimeType?: string;
            size?: number;
        };
    };
}

export default function ImageAssetNode({ data }: { data: ImageAssetNode['data'] }) {
    const formatFileSize = (size?: number) => {
        if (!size) return '';
        const mb = size / (1024 * 1024);
        return `${mb.toFixed(1)}MB`;
    };

    const handleDetailsClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Image details clicked');
        if (data.onDetailsClick) {
            data.onDetailsClick();
        }
    };

    return (
        <div
            className="bg-purple-600 border-2 border-purple-500 rounded-lg shadow-lg w-[360px] h-[270px] overflow-hidden relative group"
        >
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-purple-400 !border-purple-300 !w-3 !h-3"
            />

            {/* Image preview area */}
            <div className="bg-purple-700 h-48 flex items-center justify-center relative">
                {data.url ? (
                    <img
                        src={data.url}
                        alt={data.name}
                        className="w-full h-full object-cover rounded"
                    />
                ) : (
                    <Image className="h-16 w-16 text-purple-200" />
                )}

                {/* Details button */}
                <button
                    onClick={handleDetailsClick}
                    className="absolute top-2 right-2 bg-purple-800 hover:bg-purple-700 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="View details"
                >
                    <Info className="h-4 w-4 text-purple-200" />
                </button>
            </div>

            <div className="p-4 text-white space-y-2">
                <div className="text-base font-semibold truncate" title={data.name}>
                    {data.name}
                </div>

                <div className="flex items-center justify-between text-sm text-purple-100">
                    {data.metadata?.size && (
                        <span>{formatFileSize(data.metadata.size)}</span>
                    )}
                </div>

                {data.metadata?.width && data.metadata?.height && (
                    <div className="text-sm text-purple-200">
                        {data.metadata.width}×{data.metadata.height}px
                    </div>
                )}
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-purple-400 !border-purple-300 !w-3 !h-3"
            />
        </div>
    );
} 