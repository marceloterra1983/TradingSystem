// Utility function to format timestamp in filename format (YYYYMMDD-HHMMSS)
const formatTimestamp = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${date}-${time}`;
};

export const downloadFile = (filename: string, mimeType: string, content: string | Blob) => {
  const timestamp = formatTimestamp();
  const nameWithoutTimestamp = filename.replace(/\d{8}-\d{6}/, ''); // Remove any existing timestamp
  const finalName = nameWithoutTimestamp.replace(
    /^(.*?)(?:-raw)?\.([^.]+)$/,
    `$1-${timestamp}${nameWithoutTimestamp.includes('-raw') ? '-raw' : ''}.$2`
  );

  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
];

const DEFAULT_MIME_TYPE = 'image/png';

export const downloadScreenshot = (dataUri: string) => {
  // Validate data URI format
  if (!dataUri.startsWith('data:')) {
    console.error('Invalid data URI format');
    throw new Error('Invalid data URI format');
  }

  // Extract MIME type and validate
  const matches = dataUri.match(/^data:([^;]+);base64,/);
  if (!matches) {
    console.warn('Could not determine MIME type, using default');
    const mimeType = DEFAULT_MIME_TYPE;
    const extension = 'png';
    return processScreenshot(dataUri, mimeType, extension);
  }

  const mimeType = matches[1];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    console.warn(`Unsupported MIME type: ${mimeType}, using default`);
    return processScreenshot(dataUri, DEFAULT_MIME_TYPE, 'png');
  }

  const extension = mimeType.split('/')[1];
  return processScreenshot(dataUri, mimeType, extension);
};

const processScreenshot = (dataUri: string, mimeType: string, extension: string) => {
  try {
    // Extract base64 data
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('No image data found in data URI');
    }

    // Convert base64 to binary
    const content = atob(base64Data);
    const buffer = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      buffer[i] = content.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: mimeType });
    downloadFile(`screenshot-${formatTimestamp()}.${extension}`, mimeType, blob);
  } catch (error) {
    console.error('Error processing screenshot:', error);
    throw new Error('Failed to process screenshot data');
  }
};