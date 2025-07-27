import React, { useRef } from 'react';
import { Button } from '../ui/button';
import { Upload, X } from 'lucide-react';

interface UploadOverlayProps {
    showUpload: boolean;
    uploading: boolean;
    onClose: () => void;
    onDrop: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onFileSelect: (files: FileList) => void;
}

export function UploadOverlay({
    showUpload,
    uploading,
    onClose,
    onDrop,
    onDragOver,
    onFileSelect,
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

    if (!showUpload) return null;

    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {/* Upload Overlay */}
            <div
                className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50"
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 max-w-md w-full mx-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-semibold">Upload Assets</h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                        <p className="text-white mb-2">Drop files here or click to upload</p>
                        <p className="text-zinc-400 text-sm mb-4">Supports video and image files</p>
                        <Button
                            onClick={handleChooseFiles}
                            disabled={uploading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {uploading ? 'Uploading...' : 'Choose Files'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
} 