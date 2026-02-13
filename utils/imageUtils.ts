
export const generateThumbnail = async (base64Image: string, maxWidth = 200): Promise<string> => {
    // Early return if empty or invalid
    if (!base64Image || base64Image.length < 100) {
        console.warn("generateThumbnail: Empty or invalid image provided");
        return base64Image || "";
    }

    // If it's not a data URL, it might be a blob URL or external URL - return as-is
    if (!base64Image.startsWith('data:')) {
        console.warn("generateThumbnail: Not a data URL, returning original");
        return base64Image;
    }

    return new Promise((resolve) => {
        // Timeout after 5s to prevent hangs
        const timeout = setTimeout(() => {
            console.warn("generateThumbnail: Timeout, returning original");
            resolve(base64Image);
        }, 5000);

        const img = new Image();

        // Handle both cached and new images
        const handleLoad = () => {
            clearTimeout(timeout);

            // Validate image loaded correctly
            if (img.width === 0 || img.height === 0) {
                console.warn("generateThumbnail: Image has zero dimensions");
                resolve(base64Image);
                return;
            }

            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;

            // If already smaller, return as is
            if (ratio >= 1) {
                resolve(base64Image);
                return;
            }

            canvas.width = maxWidth;
            canvas.height = Math.round(img.height * ratio);

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Fill white background to prevent black transparency in JPEGs
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                try {
                    const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
                    // Validate output is not just a white rectangle
                    if (thumbnail && thumbnail.length > 1000) {
                        resolve(thumbnail);
                    } else {
                        console.warn("generateThumbnail: Output too small, may be empty");
                        resolve(base64Image);
                    }
                } catch (e) {
                    console.warn("generateThumbnail: toDataURL failed", e);
                    resolve(base64Image);
                }
            } else {
                resolve(base64Image); // Fail-safe
            }
        };

        img.onload = handleLoad;
        img.onerror = () => {
            clearTimeout(timeout);
            console.warn("generateThumbnail: Image load error");
            resolve(base64Image);
        };

        // Set crossOrigin for CORS support (before src)
        img.crossOrigin = 'anonymous';
        img.src = base64Image;

        // Handle already-cached images (onload may not fire)
        if (img.complete && img.naturalWidth > 0) {
            handleLoad();
        }
    });
};

export const computeImageHash = async (base64String: string): Promise<string> => {
    // Simple fast hash for deduplication key
    const msgBuffer = new TextEncoder().encode(base64String.slice(0, 5000) + base64String.slice(-500)); // Sample start/end for speed?
    // Actually for correctness we should hash the whole thing or just use a random ID if we trust the user.
    // Let's use SHA-256 on the whole string. It's fast enough for <10MB.

    // In browser, crypto.subtle is async
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const buffer = new TextEncoder().encode(base64String);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback?
    return Math.random().toString(36).substring(7);
};
