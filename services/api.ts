export const API_BASE_URL = 'http://localhost:3001/api';

export interface User {
    _id: string;
    name: string;
    storageType: 'cloud' | 'local';
    createdAt: string;
}

export interface AppState {
    gallery: any[];
    detectionHistory: any[];
    theme: 'light' | 'dark';
}

export const api = {
    // Users
    getUsers: async (): Promise<User[]> => {
        const res = await fetch(`${API_BASE_URL}/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    createUser: async (name: string, storageType: 'cloud' | 'local' = 'local'): Promise<User> => {
        const res = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, storageType }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create user');
        }
        return res.json();
    },

    deleteUser: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
    },

    // Cloud-Optimized Granular Endpoints
    getUserData: async (userId: string): Promise<AppState> => {
        const res = await fetch(`${API_BASE_URL}/user-data/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        return {
            gallery: data.gallery || [],
            detectionHistory: data.detectionHistory || [],
            theme: data.theme || 'light'
        } as AppState;
    },

    addGalleryItem: async (item: any): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/gallery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to save gallery item: ${err}`);
        }
    },

    deleteGalleryItem: async (id: string, userId: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/gallery/${id}?userId=${userId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
    },

    addHistory: async (item: any): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to save history: ${err}`);
        }
    },

    saveSettings: async (userId: string, theme: string): Promise<void> => {
        const res = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, theme }),
        });
        if (!res.ok) throw new Error('Failed to save settings');
    },

    // Image Store
    uploadImage: async (params: { hash: string; data: string; userId: string; mimeType?: string }): Promise<{ id: string; reused: boolean }> => {
        const res = await fetch(`${API_BASE_URL}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error('Failed to upload image');
        return res.json();
    },

    getImage: async (id: string, storageType: 'cloud' | 'local' = 'cloud'): Promise<{ data: string; mimeType: string }> => {
        const res = await fetch(`${API_BASE_URL}/images/${id}?storageType=${storageType}`);
        if (!res.ok) throw new Error('Failed to load image');
        return res.json();
    },

    // Legacy Stubs (Deprecated)
    getState: async (userId: string): Promise<AppState> => { return api.getUserData(userId); },
    saveState: async (userId: string, state: AppState): Promise<void> => {
        // No-op: Auto-save is replaced by granular updates
    },
};
