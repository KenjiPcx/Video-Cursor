import React, { useRef } from 'react';
import { Button } from '../ui/button';
import { Upload, X, Trash2, FileIcon } from 'lucide-react';
import { FileWithDescription } from '@/hooks/use-file-upload';

interface UploadOverlayProps {
    showUpload: boolean;
    uploading: boolean;
    selectedFiles: FileWithDescription[];
    onClose: () => void;
    onDrop: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onFileSelect: (files: FileList) => void;
    onFileUpload: () => void;
    onUpdateDescription: (index: number, description: string) => void;
    onRemoveFile: (index: number) => void;
    onClearFiles: () => void;
}

export function UploadOverlay({
    showUpload,
    uploading,
    selectedFiles,
    onClose,
    onDrop,
    onDragOver,
    onFileSelect,
    onFileUpload,
    onUpdateDescription,
    onRemoveFile,
    onClearFiles,
}: UploadOverlayProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            onFileSelect(files);
        }
        // Reset the input
        event.target.value = '';
    };

    const handleChooseFiles = () => {
        fileInputRef.current?.click();
    };

    const formatFileSize = (bytes: number) => {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('video/')) return '🎬';
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('audio/')) return '🎵';
        return '📄';
    };

    if (!showUpload) return null;

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*,audio/*"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {/* Upload Overlay */}
            <div
                className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50"
                onDrop={selectedFiles.length === 0 ? onDrop : undefined}
                onDragOver={selectedFiles.length === 0 ? onDragOver : undefined}
            >
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">
                            {selectedFiles.length === 0 ? 'Upload Assets' : `Upload ${selectedFiles.length} Files`}
                        </h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    {selectedFiles.length === 0 ? (
                        /* File Selection Area */
                        <div className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center">
                            <Upload className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                            <p className="text-white mb-2">Drop files here or click to upload</p>
                            <p className="text-zinc-400 text-sm mb-4">Supports video, image, and audio files</p>
                            <Button
                                onClick={handleChooseFiles}
                                disabled={uploading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Choose Files
                            </Button>
                        </div>
                    ) : (
                        /* File List with Descriptions */
                        <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                                {selectedFiles.map((fileWithDesc, index) => (
                                    <div key={index} className="bg-zinc-700/50 border border-zinc-600 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            {/* File Icon & Info */}
                                            <div className="flex-shrink-0">
                                                <div className="text-2xl">{getFileIcon(fileWithDesc.file.type)}</div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* File name and size */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-white font-medium truncate pr-2">
                                                        {fileWithDesc.file.name}
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onRemoveFile(index)}
                                                        className="text-zinc-400 hover:text-red-400 flex-shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <p className="text-zinc-400 text-sm mb-3">
                                                    {formatFileSize(fileWithDesc.file.size)} • {fileWithDesc.file.type}
                                                </p>

                                                {/* Description input */}
                                                <div>
                                                    <label className="text-zinc-300 text-sm font-medium block mb-1">
                                                        Description (optional)
                                                    </label>
                                                    <textarea
                                                        value={fileWithDesc.description}
                                                        onChange={(e) => onUpdateDescription(index, e.target.value)}
                                                        placeholder="Describe this asset for better AI context..."
                                                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white placeholder-zinc-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        rows={2}
                                                        disabled={uploading}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-600">
                                <Button
                                    variant="outline"
                                    onClick={onClearFiles}
                                    disabled={uploading}
                                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                                >
                                    Clear All
                                </Button>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleChooseFiles}
                                        disabled={uploading}
                                        className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                                    >
                                        Add More Files
                                    </Button>
                                    <Button
                                        onClick={onFileUpload}
                                        disabled={uploading}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 