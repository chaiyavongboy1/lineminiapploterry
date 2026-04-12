/**
 * Client-side image compression using Canvas API.
 * No external libraries required.
 */

export interface CompressOptions {
    maxSizeMB?: number;    // Max output size in MB (default: 1)
    maxWidthPx?: number;   // Max width in pixels (default: 1920)
    quality?: number;      // JPEG quality 0-1 (default: 0.85)
}

export interface CompressResult {
    file: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    wasCompressed: boolean;
}

const MB = 1024 * 1024;

/**
 * Compress an image file using Canvas API.
 * Returns the compressed file and metadata.
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<CompressResult> {
    const {
        maxSizeMB = 1,
        maxWidthPx = 1920,
        quality = 0.85,
    } = options;

    const originalSizeMB = file.size / MB;

    // If already small enough, return as-is
    if (file.size <= maxSizeMB * MB) {
        return {
            file,
            originalSizeMB,
            compressedSizeMB: originalSizeMB,
            wasCompressed: false,
        };
    }

    // Load image into an HTMLImageElement
    const img = await loadImage(file);

    // Calculate target dimensions
    let { width, height } = img;
    if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
    }

    // Draw to canvas and compress iteratively
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);

    // Try compressing with decreasing quality until under limit
    let currentQuality = quality;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt++) {
        blob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);
        if (blob.size <= maxSizeMB * MB) break;
        currentQuality *= 0.8; // reduce quality by 20% each attempt
    }

    if (!blob) {
        return { file, originalSizeMB, compressedSizeMB: originalSizeMB, wasCompressed: false };
    }

    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });

    return {
        file: compressedFile,
        originalSizeMB,
        compressedSizeMB: compressedFile.size / MB,
        wasCompressed: true,
    };
}

/** Validate a file before compression */
export function validateImageFile(file: File, maxInputSizeMB = 15): string | null {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.some(t => file.type === t || file.name.toLowerCase().endsWith(t.split('/')[1]))) {
        return 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น';
    }
    if (file.size > maxInputSizeMB * MB) {
        return `ไฟล์ใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน ${maxInputSizeMB}MB`;
    }
    return null;
}

// Helpers
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        img.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
            type,
            quality
        );
    });
}
