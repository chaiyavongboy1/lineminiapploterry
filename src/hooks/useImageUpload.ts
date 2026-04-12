'use client';

import { useState, useCallback } from 'react';
import { compressImage, validateImageFile, type CompressOptions, type CompressResult } from '@/lib/image-compress';

interface UseImageUploadOptions extends CompressOptions {
    maxInputSizeMB?: number;
    accept?: string;
}

interface UseImageUploadState {
    file: File | null;
    preview: string | null;
    isCompressing: boolean;
    error: string | null;
    result: CompressResult | null;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
    const { maxInputSizeMB = 15, ...compressOptions } = options;

    const [state, setState] = useState<UseImageUploadState>({
        file: null,
        preview: null,
        isCompressing: false,
        error: null,
        result: null,
    });

    const handleFile = useCallback(async (file: File | null) => {
        if (!file) {
            setState({ file: null, preview: null, isCompressing: false, error: null, result: null });
            return;
        }

        // Validate
        const validationError = validateImageFile(file, maxInputSizeMB);
        if (validationError) {
            setState(s => ({ ...s, file: null, preview: null, error: validationError, result: null }));
            return;
        }

        // Start compression
        setState(s => ({ ...s, isCompressing: true, error: null }));

        try {
            const result = await compressImage(file, compressOptions);
            const preview = URL.createObjectURL(result.file);

            setState({
                file: result.file,
                preview,
                isCompressing: false,
                error: null,
                result,
            });
        } catch {
            setState(s => ({
                ...s,
                isCompressing: false,
                error: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่',
            }));
        }
    }, [maxInputSizeMB, compressOptions]);

    const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        handleFile(file);
    }, [handleFile]);

    const clear = useCallback(() => {
        setState(s => {
            if (s.preview) URL.revokeObjectURL(s.preview);
            return { file: null, preview: null, isCompressing: false, error: null, result: null };
        });
    }, []);

    /** Human-readable size hint shown to user */
    const sizeHint = state.result
        ? state.result.wasCompressed
            ? `ปรับขนาดแล้ว: ${state.result.originalSizeMB.toFixed(1)}MB → ${state.result.compressedSizeMB.toFixed(2)}MB`
            : `${state.result.compressedSizeMB.toFixed(2)}MB`
        : null;

    return {
        ...state,
        sizeHint,
        onInputChange,
        handleFile,
        clear,
    };
}
