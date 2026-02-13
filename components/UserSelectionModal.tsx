import React, { useState } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import { User, Plus, Trash2, LogIn, Loader2 } from 'lucide-react';
import { TEXT } from '../constants/text';

const UserSelectionModal = () => {
    const { users, login, registerUser, deleteUser, isLoading, currentUser } = useGlobalState();
    const [isRegistering, setIsRegistering] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [storageType, setStorageType] = useState<'cloud' | 'local'>('local');

    // If we have a current user, don't show modal
    if (currentUser) return null;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim()) return;
        await registerUser(newUserName.trim(), storageType);
        setNewUserName('');
        setStorageType('local');
        setIsRegistering(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Sign in to access your benchmarks</p>
                </div>

                {isRegistering ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                New User Name
                            </label>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                placeholder="Ex. Alice"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Storage Preference
                            </label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStorageType('cloud')}
                                    className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${storageType === 'cloud'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500'
                                        }`}
                                >
                                    <span className="font-semibold text-sm">Cloud (Sync)</span>
                                    <span className="text-xs opacity-70">MongoDB Atlas</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStorageType('local')}
                                    className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${storageType === 'local'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500'
                                        }`}
                                >
                                    <span className="font-semibold text-sm">Local (Private)</span>
                                    <span className="text-xs opacity-70">Browser Only</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsRegistering(false)}
                                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!newUserName.trim() || isLoading}
                                className="flex-1 py-2 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create User
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {users.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic">
                                    No users found. Create one to get started.
                                </div>
                            ) : (
                                users.map(user => (
                                    <div key={user._id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/50">
                                        <button
                                            onClick={() => login(user._id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center gap-3 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 capitalize border border-slate-100 dark:border-slate-600">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white capitalize">{user.name}</p>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${user.storageType === 'local'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                        }`}>
                                                        {user.storageType === 'local' ? 'LOCAL' : 'CLOUD'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400">Last active: Recently</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteUser(user._id); }}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setIsRegistering(true)}
                            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-500 transition-all font-medium flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <Plus className="w-4 h-4" /> Add New User
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default UserSelectionModal;
