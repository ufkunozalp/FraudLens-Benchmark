import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GalleryItem, DetectionResult } from '../types';
import { api, User } from '../services/api';
import { getStorageProvider, StorageProvider } from '../services/storageService';
import { createClientId } from '../utils/idUtils';

interface GlobalContextType {
  // User Management
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (userId: string, userObject?: User) => Promise<void>;
  registerUser: (name: string, storageType: 'cloud' | 'local') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  logout: () => void;

  // App State
  gallery: GalleryItem[];
  addToGallery: (url: string, source: 'generated' | 'edited', prompt?: string, modelId?: string, latency?: number) => Promise<void>;
  detectionHistory: DetectionResult[];
  addDetectionResult: (result: Omit<DetectionResult, 'id' | 'timestamp'>) => Promise<void>;
  updateFeedback: (id: string, feedback: 'correct' | 'incorrect') => Promise<void>;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Storage Utils
  getFullImage: (referenceId: string) => Promise<string>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Storage Provider - use ref to avoid closure issues in callbacks
  const storageRef = React.useRef<StorageProvider>(getStorageProvider('cloud'));
  const [, forceStorageUpdate] = useState(0); // Trigger re-render when storage changes

  const setStorage = (provider: StorageProvider) => {
    storageRef.current = provider;
    forceStorageUpdate(n => n + 1);
  };

  // App Data State
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<DetectionResult[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  // --- Initialization ---
  useEffect(() => {
    refreshUsers();
  }, []);

  // --- Theme Effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const refreshUsers = async () => {
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  // Ref to track latest user ID for race condition prevention
  const latestUserIdRef = React.useRef<string | null>(null);

  // Track pending save operations to ensure they complete before user switch
  const pendingSavesRef = React.useRef<Promise<void>[]>([]);

  const trackSave = (savePromise: Promise<void>) => {
    pendingSavesRef.current.push(savePromise);
    // Clean up completed promises
    savePromise.finally(() => {
      pendingSavesRef.current = pendingSavesRef.current.filter(p => p !== savePromise);
    });
  };

  const waitForPendingSaves = async () => {
    if (pendingSavesRef.current.length > 0) {
      console.log(`Waiting for ${pendingSavesRef.current.length} pending saves...`);
      await Promise.all(pendingSavesRef.current);
    }
  };

  // --- Data Loading Effect ---
  useEffect(() => {
    const handleUserChange = async () => {
      latestUserIdRef.current = currentUser?._id || null;

      // Wait for any pending saves from previous session
      await waitForPendingSaves();

      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setGallery([]);
        setDetectionHistory([]);
        setTheme('light');
      }
    };

    handleUserChange();
  }, [currentUser]);

  const loadUserData = async (user: User) => {
    try {
      const provider = getStorageProvider(user.storageType || 'cloud');
      setStorage(provider);
      console.log(`Storage provider set to: ${provider.type} for user ${user.name}`);

      // Fetch Data (Background)
      const data = await provider.getUserData(user._id);

      // CRITICAL: Check if we are still the active user
      if (latestUserIdRef.current !== user._id) {
        console.warn(`Ignoring stale data load for ${user.name}`);
        return;
      }

      setGallery(data.gallery || []);
      setDetectionHistory(data.detectionHistory || []);
      if (data.theme) setTheme(data.theme);
    } catch (err) {
      console.error("Load failed:", err);
    }
  };

  const login = async (userId: string, userObject?: User) => {
    setIsLoading(true);
    try {
      const user = userObject || users.find(u => u._id === userId);
      if (!user) throw new Error('User not found');

      // OPTIMISTIC UPDATE: Set user immediately to close modal
      setCurrentUser(user);
    } catch (err) {
      console.error('Login failed:', err);
      alert('Failed to login. Check console.');
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (name: string, storageType: 'cloud' | 'local') => {
    setIsLoading(true);
    try {
      const newUser = await api.createUser(name, storageType);
      await refreshUsers();
      await login(newUser._id, newUser);
    } catch (err: any) {
      console.error('Registration failed:', err);
      alert(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure? This will delete all user data permanently.')) return;

    setIsLoading(true);
    try {
      await api.deleteUser(userId);
      if (currentUser?._id === userId) {
        logout();
      }
      await refreshUsers();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setGallery([]);
    setDetectionHistory([]);
    setTheme('light');
    setStorage(getStorageProvider('cloud')); // Reset to default
  };

  // --- Data Actions (Using Storage Provider) ---
  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      if (currentUser) {
        storageRef.current.saveSettings(currentUser._id, newTheme).catch(console.error);
      }
      return newTheme;
    });
  };

  const getFullImage = async (referenceId: string): Promise<string> => {
    // Helper for UI to upgrade thumbnail to full image
    return storageRef.current.getFullImage(referenceId);
  };

  const addToGallery = async (url: string, source: 'generated' | 'edited', prompt?: string, modelId?: string, latency?: number) => {
    // Generate temp ID for optimistic UI
    const newItem = {
      id: createClientId(),
      url, // Initially full URL for immediate feedback
      source,
      timestamp: Date.now(),
      prompt,
      modelId,
      latency,
      isThumbnail: false // Start as full
    };

    setGallery(prev => [newItem, ...prev]);

    if (currentUser) {
      // Track this save operation for user-switch safety
      const saveOp = storageRef.current.processAndAddToGallery(currentUser._id, () => url, newItem)
        .catch(e => console.error("Failed to sync gallery item", e));
      trackSave(saveOp);
    }
  };

  const addDetectionResult = async (result: Omit<DetectionResult, 'id' | 'timestamp'>) => {
    const newResult: DetectionResult = {
      ...result,
      id: createClientId(),
      timestamp: Date.now(),
      isThumbnail: false
    };

    if (newResult.sourceType === 'generated') {
      if (newResult.label === 'FAKE') {
        newResult.feedback = 'correct';
      } else if (newResult.label === 'REAL') {
        newResult.feedback = 'incorrect';
      }
    }

    setDetectionHistory(prev => [newResult, ...prev]);

    if (currentUser) {
      // Track this save operation for user-switch safety
      const fullUrl = result.imageUrl || "";
      const saveOp = storageRef.current.processAndAddHistory(currentUser._id, () => fullUrl, newResult)
        .catch(e => console.error("Failed to sync history", e));
      trackSave(saveOp);
    }
  };

  const updateFeedback = async (id: string, feedback: 'correct' | 'incorrect') => {
    setDetectionHistory(prev => prev.map(item =>
      item.id === id ? { ...item, feedback } : item
    ));
    // Note: Feedback update not strictly persisted in simplified architecture
  };

  return (
    <GlobalContext.Provider value={{
      currentUser,
      users,
      isLoading,
      login,
      registerUser,
      deleteUser,
      logout,

      gallery,
      addToGallery,
      detectionHistory,
      addDetectionResult,
      updateFeedback,
      theme,
      toggleTheme,
      getFullImage
    }}>
      {children}
    </GlobalContext.Provider>
  );
};


export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobalState must be used within GlobalProvider');
  return context;
};
