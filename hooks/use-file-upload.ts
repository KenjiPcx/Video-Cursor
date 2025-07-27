import { useCallback, useState } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { useUploadFile } from '@convex-dev/r2/react';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface UseFileUploadProps {
    projectId: Id<"projects">;
}

export interface FileWithDescription {
    file: File;
    description: string;
}

export function useFileUpload({ projectId }: UseFileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileWithDescription[]>([]);
    const uploadFile = useUploadFile(api.upload);
    const createAsset = useAction(api.upload.createAssetFromUpload);

    // Handle file selection (for showing in UI before upload)
    const handleFileSelection = useCallback((files: FileList) => {
        const filesWithDescriptions: FileWithDescription[] = Array.from(files).map(file => ({
            file,
            description: '', // Start with empty description
        }));
        setSelectedFiles(filesWithDescriptions);
    }, []);

    // Update description for a specific file
    const updateFileDescription = useCallback((index: number, description: string) => {
        setSelectedFiles(prev => prev.map((item, i) =>
            i === index ? { ...item, description } : item
        ));
    }, []);

    // Remove a file from the selection
    const removeFile = useCallback((index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Clear all selected files
    const clearFiles = useCallback(() => {
        setSelectedFiles([]);
    }, []);

    // Handle file upload with descriptions
    const handleFileUpload = useCallback(async (filesWithDescriptions?: FileWithDescription[]) => {
        const filesToUpload = filesWithDescriptions || selectedFiles;
        if (!filesToUpload.length) return;

        console.log('📁 Starting file upload for', filesToUpload.length, 'files');
        setUploading(true);

        for (let i = 0; i < filesToUpload.length; i++) {
            const { file, description } = filesToUpload[i];

            try {
                console.log('📤 Uploading file:', file.name, `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

                // Upload file directly to R2 (handles large files without size limits)
                const key = await uploadFile(file);

                console.log('📦 File uploaded to R2 with key:', key);

                // Create asset record in database with description
                await createAsset({
                    key,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    projectId,
                    category: "upload",
                    description: description || undefined, // Only pass description if it's not empty
                });

                console.log('✅ File uploaded successfully:', file.name);

            } catch (error) {
                console.error('❌ Failed to upload file:', file.name, error);
                throw error;
            }
        }

        setUploading(false);
        setSelectedFiles([]); // Clear after successful upload
        console.log('📁 Upload process completed');
    }, [uploadFile, createAsset, projectId, selectedFiles]);

    // Handle drag and drop (for immediate selection)
    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            console.log('🎯 Files dropped:', files.length);
            handleFileSelection(files);
        }
    }, [handleFileSelection]);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
    }, []);

    return {
        uploading,
        selectedFiles,
        handleFileSelection,
        updateFileDescription,
        removeFile,
        clearFiles,
        handleFileUpload,
        handleDrop,
        handleDragOver,
    };
} 