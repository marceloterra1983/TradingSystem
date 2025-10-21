import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DownloadIcon, MaximizeIcon, Loader2Icon } from 'lucide-react';
import { downloadScreenshot } from '@/utils/download';

export interface ScreenshotViewerProps {
  screenshot: string; // base64 data URI
  alt?: string;
  onDownload?: () => void;
}

export function ScreenshotViewer({ screenshot, alt = 'Screenshot preview', onDownload }: ScreenshotViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleDownload = () => {
    try {
      downloadScreenshot(screenshot);
      onDownload?.();
    } catch (error) {
      console.error('Failed to download screenshot:', error);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="relative w-full">
      {/* Preview Container */}
      <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load screenshot</p>
          </div>
        )}

        <img
          src={screenshot}
          alt={alt}
          className={`w-full h-auto object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-800"
            onClick={handleDownload}
            title="Download screenshot"
          >
            <DownloadIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-800"
            onClick={() => setIsOpen(true)}
            title="View full size"
          >
            <MaximizeIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full-size Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content className="max-w-[90vw] max-h-[90vh] p-0 overflow-auto">
          <div className="sticky top-0 flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b">
            <Dialog.Title className="text-lg font-semibold">Full Screenshot</Dialog.Title>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Download screenshot"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Dialog.Close className="btn-ghost" />
            </div>
          </div>
          <div className="relative p-4">
            <img
              src={screenshot}
              alt={alt}
              className="w-full h-auto object-contain"
            />
          </div>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}