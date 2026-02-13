
import { api, AppState } from './api';
import { generateThumbnail, computeImageHash } from '../utils/imageUtils';

export type StorageType = 'cloud' | 'local';

export interface StorageProvider {
    type: StorageType;
    getUserData(userId: string): Promise<AppState>;

    // Core Actions - Now internalizes the "Split & Store" logic
    processAndAddToGallery(userId: string, getBlob: () => string, meta: any): Promise<void>;
    processAndAddHistory(userId: string, getBlob: () => string, meta: any): Promise<void>;

    // Retrieval
    getFullImage(referenceId: string): Promise<string>;

    deleteFromGallery(userId: string, itemId: string): Promise<void>;
    saveSettings(userId: string, theme: string): Promise<void>;
}

// --- UNIFIED PROVIDER (Both Cloud and Local use the API) ---
// The server routes requests to the appropriate MongoDB (Atlas or localhost)
// based on the user's storageType

class UnifiedProvider implements StorageProvider {
    type: StorageType;

    constructor(storageType: StorageType) {
        this.type = storageType;
    }

    async getUserData(userId: string): Promise<AppState> {
        return api.getUserData(userId);
    }

    private async processAndStoreItem(
        userId: string,
        getBlob: () => string,
        meta: any,
        saveItem: (item: any) => Promise<void>,
        imageField: 'url' | 'imageUrl',
        contextLabel: 'processAndAddToGallery' | 'processAndAddHistory'
    ): Promise<void> {
        const fullBase64 = getBlob();

        if (!fullBase64 || fullBase64.length < 100) {
            console.warn(`${contextLabel}: Skipping image - empty or invalid`);
            await saveItem({ ...meta, userId, isThumbnail: false });
            return;
        }

        try {
            const [hash, thumbnail] = await Promise.all([
                computeImageHash(fullBase64),
                generateThumbnail(fullBase64)
            ]);

            const imageResult = await api.uploadImage({ hash, data: fullBase64, userId });
            await saveItem({
                ...meta,
                userId,
                [imageField]: thumbnail,
                imageId: imageResult.id,
                isThumbnail: true
            });
        } catch (error) {
            console.error(`${contextLabel} error:`, error);
            await saveItem({ ...meta, userId, isThumbnail: false });
        }
    }

    async processAndAddToGallery(userId: string, getBlob: () => string, meta: any): Promise<void> {
        await this.processAndStoreItem(
            userId,
            getBlob,
            meta,
            api.addGalleryItem,
            'url',
            'processAndAddToGallery'
        );
    }

    async processAndAddHistory(userId: string, getBlob: () => string, meta: any): Promise<void> {
        await this.processAndStoreItem(
            userId,
            getBlob,
            meta,
            api.addHistory,
            'imageUrl',
            'processAndAddHistory'
        );
    }

    async getFullImage(imageId: string): Promise<string> {
        if (!imageId || imageId.length < 10) return '';
        try {
            const image = await api.getImage(imageId, this.type);
            return image?.data || '';
        } catch {
            return '';
        }
    }

    async deleteFromGallery(userId: string, itemId: string): Promise<void> {
        await api.deleteGalleryItem(itemId, userId);
    }

    async saveSettings(userId: string, theme: string): Promise<void> {
        await api.saveSettings(userId, theme);
    }
}

// Factory function
export function getStorageProvider(type: StorageType): StorageProvider {
    console.log(`Creating ${type} storage provider (both use server-side MongoDB)`);
    return new UnifiedProvider(type);
}
