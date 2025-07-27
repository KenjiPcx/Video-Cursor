import React, { useState } from 'react';
import { Handle, Position, Node } from '@xyflow/react';
import { Lightbulb, Upload, Eye, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

export interface DraftNode extends Node {
    type: 'draft';
    data: {
        title: string;
        description?: string;
        estimatedDuration?: number;
        placeholderImage?: string;
        jsonPrompt?: any; // The structured JSON metadata from AI
    };
}

export default function DraftNode({ data, selected }: { data: DraftNode['data']; selected?: boolean }) {
    const [showDetails, setShowDetails] = useState(false);

    const handleViewDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDetails(true);
    };

    return (
        <>
            <div className={`bg-zinc-700 border-2 ${selected ? 'border-zinc-500' : 'border-zinc-600'} rounded-lg p-3 shadow-sm min-w-[180px] max-w-[220px]`}>
                {/* Input handle */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!bg-zinc-500 !border-zinc-400 !w-3 !h-3"
                />

                <div className="text-white space-y-2">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-zinc-300" />
                        <span className="text-sm font-semibold truncate">{data.title}</span>
                    </div>

                    {data.description && (
                        <p className="text-xs text-zinc-200 line-clamp-4 leading-relaxed">{data.description}</p>
                    )}

                    {data.estimatedDuration && (
                        <div className="text-xs text-zinc-300">
                            ~{data.estimatedDuration}s
                        </div>
                    )}

                    <div className="flex gap-1">
                        {/* View Details Button */}
                        {data.jsonPrompt && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleViewDetails}
                                className="flex-1 h-8 text-xs border-zinc-500 text-zinc-300 hover:bg-zinc-600 hover:text-zinc-200"
                            >
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                            </Button>
                        )}

                        {/* Add Asset Button */}
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs border-zinc-500 text-zinc-300 hover:bg-zinc-600 hover:text-zinc-200"
                        >
                            <Upload className="h-3 w-3 mr-1" />
                            Asset
                        </Button>
                    </div>
                </div>

                {/* Output handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!bg-zinc-500 !border-zinc-400 !w-3 !h-3"
                />
            </div>

            {/* Details Modal */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{data.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Description Section */}
                        {data.description && (
                            <div className="bg-zinc-900/50 p-4 rounded-lg border-l-4 border-zinc-500">
                                <h3 className="text-lg font-semibold mb-2 text-zinc-200">Description</h3>
                                <p className="text-zinc-300 leading-relaxed">{data.description}</p>
                                {data.estimatedDuration && (
                                    <p className="text-sm text-zinc-400 mt-2">
                                        <strong>Duration:</strong> {data.estimatedDuration} seconds
                                    </p>
                                )}
                            </div>
                        )}

                        {/* JSON Metadata Section */}
                        {data.jsonPrompt && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-zinc-200">Production Metadata</h3>

                                {/* Render structured sections */}
                                {Object.entries(data.jsonPrompt).map(([key, value]) => (
                                    <div key={key} className="bg-zinc-900/30 p-4 rounded-lg">
                                        <h4 className="text-md font-semibold capitalize text-zinc-300 mb-2 border-b border-zinc-700 pb-1">
                                            {key.replace(/_/g, ' ')}
                                        </h4>

                                        {typeof value === 'object' && value !== null ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {Object.entries(value as Record<string, any>).map(([subKey, subValue]) => (
                                                    <div key={subKey} className="space-y-1">
                                                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                                            {subKey.replace(/_/g, ' ')}
                                                        </span>
                                                        <p className="text-sm text-zinc-200">
                                                            {typeof subValue === 'boolean' ?
                                                                (subValue ? 'Yes' : 'No') :
                                                                (String(subValue) || 'Not specified')
                                                            }
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-200">{String(value) || 'Not specified'}</p>
                                        )}
                                    </div>
                                ))}

                                {/* Raw JSON for developers */}
                                <details className="bg-zinc-900/50 p-4 rounded-lg">
                                    <summary className="text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-300">
                                        View Raw JSON
                                    </summary>
                                    <pre className="mt-3 text-xs text-zinc-300 bg-black/30 p-3 rounded overflow-x-auto">
                                        {JSON.stringify(data.jsonPrompt, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
} 