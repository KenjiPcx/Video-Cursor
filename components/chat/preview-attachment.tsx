'use client';

import type { Attachment } from 'ai';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  X,
  FileCode,
  FileVideo,
  FileAudio
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

import { LoaderIcon } from '../icons';

const getFileIcon = (contentType: string, fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (contentType.startsWith('image/')) {
    return <FileImage className="w-6 h-6 text-blue-500" />;
  }

  if (contentType === 'application/pdf' || extension === 'pdf') {
    return <FileText className="w-6 h-6 text-red-500" />;
  }

  if (contentType.includes('spreadsheet') ||
    ['xlsx', 'xls', 'csv'].includes(extension || '')) {
    return <FileSpreadsheet className="w-6 h-6 text-green-500" />;
  }

  if (contentType.includes('text') ||
    ['txt', 'md', 'markdown'].includes(extension || '')) {
    return <FileText className="w-6 h-6 text-gray-500" />;
  }

  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(extension || '')) {
    return <FileCode className="w-6 h-6 text-purple-500" />;
  }

  if (contentType.startsWith('video/')) {
    return <FileVideo className="w-6 h-6 text-orange-500" />;
  }

  if (contentType.startsWith('audio/')) {
    return <FileAudio className="w-6 h-6 text-yellow-500" />;
  }

  return <File className="w-6 h-6 text-gray-400" />;
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-testid="input-attachment-preview"
      className="flex flex-col gap-2 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center">
              {getFileIcon(contentType, name || '')}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center">
            <File className="w-6 h-6 text-gray-400" />
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}

        {onRemove && isHovered && !isUploading && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
