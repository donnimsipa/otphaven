import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Settings as SettingsIcon, ShieldCheck, Lock, LogOut, ArrowLeft, Info, Layers, HelpCircle, X, BookOpen, Key, Clock, Save, Wifi, AlertCircle, Database, Trash2, Grid, List, Edit2 } from 'lucide-react';
import { TOTPAccount, AppSettings, VaultState, DecryptedVault } from './types';
import { saveVault, loadVault, vaultExists, clearVault, getStorageUsage } from './services/cryptoService';
import { parseMigrationUrl } from './services/totpService';
import TOTPCard from './components/TOTPCard';
import Scanner from './components/Scanner';
import Settings from './components/Settings';
import P2PSync from './components/P2PSync';
import { motion, AnimatePresence } from 'framer-motion';
import { version } from './package.json';

const PUBLIC_PIN = '0000000000'; // Hardcoded internal key for disabled PIN mode
const DIS_PIN = import.meta.env.VITE_DISABLE_PIN === 'true';
const LOGIN_MSG = import.meta.env.VITE_LOGIN_MESSAGE || '';

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    syncMethod: 'offline',
    autoReveal: true,
    showNextCode: false,
    autoLockDuration: 60, // Default 60 seconds
    s3Config: { endpoint: '', accessKey: '', secretKey: '', bucket: '', region: 'us-east-1' },
    nostrConfig: { relays: ['wss://relay.damus.io'] }
};

const PREVIEW_ACCOUNTS: TOTPAccount[] = [
    // Work
    { id: 'prev-1', category: 'Work', secret: 'JBSWY3DPEHPK3PXP', issuer: 'Google Workspace', label: 'bob@company.com' },
    { id: 'prev-2', category: 'Work', secret: 'ORSXG5A=', issuer: 'AWS Root', label: 'admin-account' },

    // Personal - Mixed (Password + TOTP)
    { id: 'prev-3', category: 'Personal', secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ', password: 'correct-horse-battery-staple', issuer: 'GitHub', label: 'dev_master' },

    // Finance - TOTP Only
    { id: 'prev-4', category: 'Finance', secret: 'JBSWY3DPEHPK3PXP', issuer: 'Coinbase', label: 'crypto_wallet' },

    // Uncategorized - Password Only
    { id: 'prev-5', issuer: 'Home WiFi', label: 'MyNetwork_5G', password: 'SuperSecretWifiPassword123!' },

    // Uncategorized - TOTP Only
    { id: 'prev-6', issuer: 'Discord', label: 'gamer_tag', secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ' },
];

const App: React.FC = () => {
    // State
    const [pin, setPin] = useState('');
    const [isSetup, setIsSetup] = useState(false);
    const [vaultState, setVaultState] = useState<VaultState>({ isLocked: true, hasVault: false, data: null });
    const [view, setView] = useState<'home' | 'settings' | 'scanner' | 'add' | 'p2p'>('home');
    const [search, setSearch] = useState('');
    const [storageStats, setStorageStats] = useState(getStorageUsage());

    // Idle Timer State
    const lastActivityRef = useRef<number>(Date.now());

    // Form State (Add/Edit)
    const [formState, setFormState] = useState<{
        id: string | null;
        issuer: string;
        label: string;
        secret: string;
        password: string;
        category: string;
        algorithm?: string;
        digits?: number;
        period?: number;
    }>({ id: null, issuer: '', label: '', secret: '', password: '', category: '' });

    const [errorMsg, setErrorMsg] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    // Initialization
    useEffect(() => {
        const hasVault = vaultExists();

        if (DIS_PIN) {
            // No-PIN mode: Auto-unlock immediately without showing PIN screen
            setPin(PUBLIC_PIN);
            try {
                if (!hasVault) {
                    // Initial setup for No-PIN mode
                    const initialVault: DecryptedVault = { accounts: [], settings: DEFAULT_SETTINGS };
                    saveVault(initialVault, PUBLIC_PIN);
                    setVaultState({ isLocked: false, hasVault: true, data: initialVault });
                } else {
                    // Auto unlock
                    const data = loadVault(PUBLIC_PIN);
                    if (data) {
                        setVaultState({ isLocked: false, hasVault: true, data });
                    } else {
                        // Vault exists but encrypted with real PIN - fallback to locked state
                        setVaultState(prev => ({ ...prev, hasVault, isLocked: true }));
                    }
                }
            } catch (e) {
                console.error("Auto-unlock failed", e);
                // Even on error, try to show unlocked state with empty vault
                const initialVault: DecryptedVault = { accounts: [], settings: DEFAULT_SETTINGS };
                saveVault(initialVault, PUBLIC_PIN);
                setVaultState({ isLocked: false, hasVault: true, data: initialVault });
            }
            setIsSetup(false);
        } else {
            setVaultState(prev => ({ ...prev, hasVault, isLocked: true }));
            setIsSetup(!hasVault);
        }
    }, []);

    // Recalculate storage when view changes or vault saves
    useEffect(() => {
        setStorageStats(getStorageUsage());
    }, [view, vaultState.data]);

    // Theme Logic
    useEffect(() => {
        const applyTheme = () => {
            // If vault is locked/not loaded, use system default, otherwise use settings
            const theme = vaultState.data?.settings.theme || 'system';
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            let isDark = false;
            if (theme === 'dark') isDark = true;
            else if (theme === 'light') isDark = false;
            else isDark = systemDark;

            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        applyTheme();

        // Listener for system changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme();
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, [vaultState.data?.settings.theme]); // Re-run when settings change

    // --- Auto Lock Logic ---
    const handleUserActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        // Attach listeners for user activity
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('touchstart', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        // Check for idle
        const intervalId = setInterval(() => {
            if (vaultState.isLocked || !vaultState.data || DIS_PIN) return;

            const autoLockDuration = vaultState.data.settings.autoLockDuration ?? 60; // Default 60s
            if (autoLockDuration === 0) return; // Disabled

            const inactiveSeconds = (Date.now() - lastActivityRef.current) / 1000;

            if (inactiveSeconds > autoLockDuration) {
                console.log("Auto-locking due to inactivity");
                setVaultState(prev => ({ ...prev, isLocked: true, data: null })); // Clear data from memory
                setPin(''); // Clear PIN
                setView('home'); // Reset view
            }
        }, 1000);

        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('touchstart', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            clearInterval(intervalId);
        };
    }, [vaultState.isLocked, vaultState.data, handleUserActivity]);


    // Actions
    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSetup) {
            // Creating new vault
            if (pin.length < 4) {
                setErrorMsg("PIN must be at least 4 digits");
                return;
            }
            const initialVault: DecryptedVault = { accounts: [], settings: DEFAULT_SETTINGS };
            saveVault(initialVault, pin);
            setVaultState({ isLocked: false, hasVault: true, data: initialVault });
            setIsSetup(false);
            lastActivityRef.current = Date.now(); // Reset timer
        } else {
            // Unlocking
            try {
                const data = loadVault(pin);
                if (data) {
                    const mergedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
                    // Migration
                    if ('darkMode' in data.settings) {
                        // @ts-ignore
                        mergedSettings.theme = data.settings.darkMode ? 'dark' : 'light';
                        // @ts-ignore
                        delete mergedSettings.darkMode;
                    }

                    setVaultState({ isLocked: false, hasVault: true, data: { ...data, settings: mergedSettings } });
                    setErrorMsg('');
                    lastActivityRef.current = Date.now(); // Reset timer
                }
            } catch (e) {
                console.error(e);
                setErrorMsg("Incorrect PIN");
            }
        }
    };

    const handleUpdateVault = (newData: DecryptedVault) => {
        setVaultState(prev => ({ ...prev, data: newData }));
        saveVault(newData, pin);
        lastActivityRef.current = Date.now();
    };

    const handleSaveAccount = (account: TOTPAccount) => {
        if (!vaultState.data) return;

        // Set timestamp
        account.updatedAt = Date.now();

        let newAccounts = [...vaultState.data.accounts];
        const existingIndex = newAccounts.findIndex(a => a.id === account.id);

        if (existingIndex >= 0) {
            // Update existing
            newAccounts[existingIndex] = account;
        } else {
            // Create new
            newAccounts.push(account);
        }

        handleUpdateVault({ ...vaultState.data, accounts: newAccounts });
        setView('home');
        resetForm();
    };

    const resetForm = () => {
        setFormState({ id: null, issuer: '', label: '', secret: '', password: '', category: '' });
    };

    const deleteAccount = (id: string) => {
        if (!vaultState.data) return;
        const newAccounts = vaultState.data.accounts.filter(a => a.id !== id);
        handleUpdateVault({ ...vaultState.data, accounts: newAccounts });
    };

    const initiateEdit = (account: TOTPAccount) => {
        setFormState({
            id: account.id,
            issuer: account.issuer,
            label: account.label,
            secret: account.secret || '',
            password: account.password || '',
            category: account.category || '',
            algorithm: account.algorithm,
            digits: account.digits,
            period: account.period
        });
        setView('add'); // Reusing 'add' view for editing
    };

    const handleScan = (data: string) => {
        const account = parseMigrationUrl(data);
        if (account) {
            handleSaveAccount(account);
            setView('home'); // Auto-close to home after successful scan
        } else {
            alert("Invalid QR Code");
        }
    };

    const handleBatchImageImport = async (files: FileList) => {
        if (!vaultState.data) return;

        const { Html5Qrcode } = await import('html5-qrcode');
        let successCount = 0;
        let failCount = 0;
        const newAccounts: TOTPAccount[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const html5QrCode = new Html5Qrcode("batch-reader");
                const result = await html5QrCode.scanFile(file, false);
                const account = parseMigrationUrl(result);
                
                if (account) {
                    account.updatedAt = Date.now();
                    newAccounts.push(account);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                console.error(`Failed to scan ${file.name}:`, e);
                failCount++;
            }
        }

        // Save all accounts at once
        if (newAccounts.length > 0) {
            const updatedAccounts = [...vaultState.data.accounts, ...newAccounts];
            handleUpdateVault({ ...vaultState.data, accounts: updatedAccounts });
        }

        alert(`Batch Import Complete:\n✓ Success: ${successCount}\n✗ Failed: ${failCount}`);
        setView('home');
    };

    const handleImport = (importedVault: DecryptedVault) => {
        handleUpdateVault(importedVault);
    };

    // Sync Logic with Conflict Summary
    const handleP2PMerge = (remoteVault: DecryptedVault) => {
        if (!vaultState.data) return;

        const localMap = new Map<string, TOTPAccount>(vaultState.data.accounts.map(a => [a.id, a]));
        let added = 0;
        let updated = 0;
        let skipped = 0;

        remoteVault.accounts.forEach(remoteAcc => {
            const localAcc = localMap.get(remoteAcc.id);
            if (!localAcc) {
                // New account
                localMap.set(remoteAcc.id, remoteAcc);
                added++;
            } else {
                // Conflict: Check timestamp
                const localTime = localAcc.updatedAt || 0;
                const remoteTime = remoteAcc.updatedAt || 0;
                if (remoteTime > localTime) {
                    localMap.set(remoteAcc.id, remoteAcc);
                    updated++;
                } else {
                    skipped++;
                }
            }
        });

        if (added > 0 || updated > 0) {
            const mergedAccounts = Array.from(localMap.values());
            handleUpdateVault({ ...vaultState.data, accounts: mergedAccounts });
        }

        alert(`Sync Summary:\n- Added: ${added}\n- Updated: ${updated}\n- Skipped (Older): ${skipped}`);
    };

    const handleLogout = () => {
        setVaultState(prev => ({ ...prev, isLocked: true, data: null }));
        setPin('');
        setView('home');
    };

    // View Preparation
    const isPreview = vaultState.data && vaultState.data.accounts.length === 0;
    const sourceAccounts = isPreview ? PREVIEW_ACCOUNTS : (vaultState.data?.accounts || []);

    // Filter
    const filteredAccounts = sourceAccounts.filter(acc =>
        acc.issuer.toLowerCase().includes(search.toLowerCase()) ||
        acc.label.toLowerCase().includes(search.toLowerCase()) ||
        (acc.category || '').toLowerCase().includes(search.toLowerCase())
    );

    // Grouping Logic
    const groupedAccounts = filteredAccounts.reduce((acc, account) => {
        const category = account.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(account);
        return acc;
    }, {} as Record<string, TOTPAccount[]>);

    // Sort Categories
    const sortedCategories = Object.keys(groupedAccounts).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const autoReveal = vaultState.data?.settings.autoReveal ?? true;
    const showNextCode = vaultState.data?.settings.showNextCode ?? false;
    const currentAutoLockDuration = vaultState.data?.settings.autoLockDuration ?? 60;

    // Logic to block new accounts if storage is low (less than 1MB remaining)
    const remainingBytes = storageStats.limitBytes - storageStats.usedBytes;
    const isStorageLow = remainingBytes < 1024 * 1024; // 1MB
    // Only block if creating a new entry. Editing existing entries is allowed (doesn't add significant size).
    const blockNewEntry = isStorageLow && !formState.id;

    // --- Views ---

    if (vaultState.isLocked) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors">
                <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-brand-100 dark:bg-brand-900/50 rounded-full text-brand-600 dark:text-brand-400">
                            <ShieldCheck size={48} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-1 text-gray-900 dark:text-white">otphaven</h1>
                    <p className="text-center text-[10px] font-mono text-gray-400 dark:text-gray-500 mb-6 uppercase tracking-widest">Version {version}</p>

                    {LOGIN_MSG && (
                        <div className="mb-6 p-3 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 rounded-xl text-center">
                            <p className="text-xs text-brand-700 dark:text-brand-300 font-medium whitespace-pre-wrap">
                                {LOGIN_MSG.split('\\n').map((line, i) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        {i !== LOGIN_MSG.split('\\n').length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </p>
                        </div>
                    )}

                    <p className="text-center text-gray-500 mb-8">
                        {isSetup ? "Create a PIN to secure your vault" : "Enter your PIN to unlock"}
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full text-center text-3xl tracking-[0.5em] py-3 border-b-2 border-gray-200 dark:border-gray-700 bg-transparent outline-none focus:border-brand-500 text-gray-800 dark:text-white transition-colors placeholder:tracking-normal"
                            placeholder={isSetup ? "Create PIN" : "PIN"}
                            autoFocus
                        />
                        {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
                        <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-brand-500/30">
                            {isSetup ? "Create Vault" : "Unlock"}
                        </button>
                    </form>

                    {!isSetup && (
                        <button
                            onClick={() => {
                                if (confirm("This will WIPE all local data. Are you sure?")) {
                                    clearVault();
                                    window.location.reload();
                                }
                            }}
                            className="w-full mt-6 text-gray-400 text-sm hover:text-red-500 transition"
                        >
                            Forgot PIN? Reset Vault
                        </button>
                    )}
                </div>
            </div >
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center md:justify-center transition-colors">

            {/* Responsive Container: Full width/height on mobile, "App Window" style on Desktop */}
            <div className="w-full h-full md:h-[90vh] md:max-w-4xl lg:max-w-6xl bg-white dark:bg-gray-900 md:rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-gray-200 dark:border-gray-800 ring-1 ring-black/5">

                {/* Header */}
                <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 border-b border-gray-100 dark:border-gray-800 z-10 transition-colors sticky top-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {view === 'home' ? (
                                <div className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
                                    <div className="bg-brand-500 text-white p-1.5 rounded-lg">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <span className="hidden sm:inline">otphaven</span>
                                </div>
                            ) : (
                                <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                    <div className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <ArrowLeft size={20} />
                                    </div>
                                    <span className="font-medium hidden sm:inline">Back</span>
                                </button>
                            )}
                        </div>

                        {view === 'home' && (
                            <div className="flex-1 max-w-md relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search accounts..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50 transition-all border border-transparent focus:bg-white dark:focus:bg-gray-800"
                                />
                            </div>
                        )}

                        <div className="flex gap-1">
                            <button
                                onClick={() => setShowHelp(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400 hover:text-brand-600"
                                title="Help & Guide"
                            >
                                <HelpCircle size={20} />
                            </button>
                            {view === 'home' && (
                                <button
                                    onClick={() => setView('settings')}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400 hover:text-brand-600"
                                    title="Settings"
                                >
                                    <SettingsIcon size={20} />
                                </button>
                            )}
                            {!DIS_PIN && (
                                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500 dark:text-red-400" title="Lock Vault">
                                    <LogOut size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto no-scrollbar relative scroll-smooth p-0 md:p-2">
                    <AnimatePresence mode='wait'>

                        {/* Home: List / Grid */}
                        {view === 'home' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="p-4 space-y-8 pb-32 max-w-7xl mx-auto"
                            >
                                {isPreview && (
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm flex items-start gap-3 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                                        <Info className="shrink-0 mt-0.5" size={18} />
                                        <p><strong>Preview Mode:</strong> These are sample accounts to demonstrate functionality. Add your own to get started.</p>
                                    </div>
                                )}

                                {filteredAccounts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <Layers size={64} className="mb-4 opacity-10" />
                                        <p>No accounts found.</p>
                                    </div>
                                ) : (
                                    sortedCategories.map(category => (
                                        <div key={category} className="space-y-4">
                                            <div className="flex items-center gap-3 ml-1">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{category}</h3>
                                                <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-800"></div>
                                            </div>

                                            {/* Responsive Grid Layout */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                                                {groupedAccounts[category].map(acc => (
                                                    <TOTPCard
                                                        key={acc.id}
                                                        account={acc}
                                                        onDelete={deleteAccount}
                                                        onEdit={initiateEdit}
                                                        isPreview={isPreview && !search}
                                                        autoReveal={autoReveal}
                                                        showNextCode={showNextCode}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Simple Footer */}
                                <footer className="pt-8 pb-4 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                                        <ShieldCheck size={14} />
                                        <span>otphaven v{version}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-600">Secure • Local • Privacy-First</p>
                                </footer>
                            </motion.div>
                        )}

                        {/* P2P Sync View */}
                        {view === 'p2p' && vaultState.data && (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center p-4">
                                <div className="w-full max-w-2xl h-full">
                                    <P2PSync
                                        currentVault={vaultState.data}
                                        onMerge={handleP2PMerge}
                                        onBack={() => setView('home')}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Settings */}
                        {view === 'settings' && vaultState.data && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl mx-auto">
                                <Settings
                                    settings={vaultState.data.settings}
                                    vault={vaultState.data}
                                    onSave={(s) => {
                                        if (vaultState.data) {
                                            handleUpdateVault({ ...vaultState.data, settings: s });
                                            setView('home');
                                        }
                                    }}
                                    onImport={handleImport}
                                    disablePin={DIS_PIN}
                                    onOpenP2PSync={() => setView('p2p')}
                                />
                            </motion.div>
                        )}

                        {/* Add/Edit Account Form */}
                        {view === 'add' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="p-6 max-w-xl mx-auto">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg text-brand-600 dark:text-brand-400">
                                        {formState.id ? <Edit2 size={24} /> : <Plus size={24} />}
                                    </div>
                                    {formState.id ? 'Edit Account' : 'Add Account'}
                                </h2>

                                {blockNewEntry ? (
                                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
                                        <AlertCircle size={24} className="shrink-0 mt-0.5 text-red-500" />
                                        <div>
                                            <h4 className="font-bold">Storage Full</h4>
                                            <p className="text-sm mt-1 text-red-700 dark:text-red-300">You have less than 1MB of storage remaining. Please delete old accounts or edit existing ones to continue.</p>
                                            <p className="text-xs mt-2 font-mono bg-red-100 dark:bg-red-900/50 p-1 px-2 rounded inline-block">{storageStats.formatted} used</p>
                                        </div>
                                    </div>
                                ) : (
                                    !formState.id && (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                <button
                                                    onClick={() => setView('scanner')}
                                                    className="w-full py-6 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gray-800 dark:hover:bg-gray-700 shadow-xl transition transform active:scale-[0.98]"
                                                >
                                                    <span className="text-3xl">📷</span>
                                                    <span className="font-semibold">Scan QR Code</span>
                                                </button>

                                                <label className="w-full py-6 bg-brand-600 dark:bg-brand-700 text-white rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-brand-700 dark:hover:bg-brand-800 shadow-xl transition transform active:scale-[0.98] cursor-pointer">
                                                    <span className="text-3xl">🖼️</span>
                                                    <span className="font-semibold">Import QR Images</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                handleBatchImageImport(e.target.files);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <div className="relative mb-8">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800"></div></div>
                                                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white dark:bg-gray-900 text-gray-500 font-medium">Or enter details manually</span></div>
                                            </div>
                                        </>
                                    )
                                )}

                                <div className="space-y-5 bg-white dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Issuer / Service</label>
                                            <input
                                                disabled={blockNewEntry}
                                                className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500/50 border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="e.g. Google, Amazon, Work VPN"
                                                value={formState.issuer}
                                                onChange={e => setFormState({ ...formState, issuer: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Username (Optional)</label>
                                            <input
                                                disabled={blockNewEntry}
                                                className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500/50 border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="user@example.com"
                                                value={formState.label}
                                                onChange={e => setFormState({ ...formState, label: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Category (Optional)</label>
                                            <input
                                                disabled={blockNewEntry}
                                                className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500/50 border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Work, Personal, Finance"
                                                value={formState.category}
                                                onChange={e => setFormState({ ...formState, category: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Secret Key</label>
                                        <input
                                            disabled={blockNewEntry}
                                            className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500/50 border transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="JBSWY3DPEHPK3PXP"
                                            value={formState.secret}
                                            onChange={e => setFormState({ ...formState, secret: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Password (Optional)</label>
                                        <div className="relative">
                                            <input
                                                disabled={blockNewEntry}
                                                className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500/50 border transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="Backup password or recovery code"
                                                type="text"
                                                value={formState.password}
                                                onChange={e => setFormState({ ...formState, password: e.target.value })}
                                            />
                                            <div className="absolute right-3 top-3 text-gray-400"><Lock size={16} /></div>
                                        </div>
                                    </div>

                                    {/* Storage Notice in Add Form */}
                                    <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${blockNewEntry ? 'text-red-600 bg-red-50 dark:bg-red-900/10' : 'text-gray-500 bg-gray-100 dark:bg-gray-900'}`}>
                                        <Database size={14} />
                                        <span>Storage: {storageStats.formatted} used (Small Scale App)</span>
                                    </div>

                                    <button
                                        disabled={blockNewEntry || (!formState.secret && !formState.password)}
                                        onClick={() => {
                                            handleSaveAccount({
                                                id: formState.id || crypto.randomUUID(),
                                                secret: formState.secret.replace(/\s/g, ''),
                                                password: formState.password,
                                                issuer: formState.issuer || 'Custom',
                                                label: formState.label || formState.issuer || 'Account',
                                                category: formState.category || 'Uncategorized',
                                                digits: formState.digits || 6,
                                                period: formState.period || 30,
                                                algorithm: formState.algorithm
                                            });
                                        }}
                                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl mt-2 flex justify-center items-center gap-2 shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
                                    >
                                        <Save size={20} />
                                        {formState.id ? 'Update Account' : 'Add Account'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Floating Action Button (Only on Home) */}
                <AnimatePresence>
                    {view === 'home' && (
                        <motion.button
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            onClick={() => {
                                resetForm();
                                setView('add');
                            }}
                            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl shadow-brand-600/30 flex items-center justify-center z-50 transition-transform active:scale-95 group"
                        >
                            <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Scanner Overlay */}
                {view === 'scanner' && (
                    <Scanner
                        onScan={handleScan}
                        onClose={() => setView('home')}
                    />
                )}

                {/* Hidden element for batch scanning */}
                <div id="batch-reader" style={{ display: 'none' }}></div>

                {/* Help Modal */}
                <AnimatePresence>
                    {showHelp && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setShowHelp(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                                    <div className="flex items-center gap-2 font-bold text-lg text-gray-800 dark:text-white">
                                        <BookOpen className="text-brand-500" size={24} />
                                        Guide & Usage
                                    </div>
                                    <button onClick={() => setShowHelp(false)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition text-gray-500 dark:text-gray-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-8 text-sm text-gray-600 dark:text-gray-300">

                                    <section className="space-y-3">
                                        <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                            <div className="p-1.5 bg-brand-100 dark:bg-brand-900/30 rounded text-brand-600 dark:text-brand-400"><Plus size={16} /></div>
                                            Adding Accounts
                                        </h3>
                                        <ul className="list-disc pl-10 space-y-1.5 marker:text-gray-300 dark:marker:text-gray-600">
                                            <li>Tap the floating <strong className="text-brand-600 dark:text-brand-400">+</strong> button.</li>
                                            <li><strong>Scan QR:</strong> Use the camera to scan a 2FA QR code from your service provider. Window closes automatically after successful scan.</li>
                                            <li><strong>Import QR Images:</strong> Select multiple QR code images from your device to import them all at once.</li>
                                            <li><strong>Manual Entry:</strong> Type in the Secret Key provided by the service if you can't scan a code.</li>
                                        </ul>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400"><Key size={16} /></div>
                                            Using the Vault
                                        </h3>
                                        <ul className="list-disc pl-10 space-y-1.5 marker:text-gray-300 dark:marker:text-gray-600">
                                            <li>Click any card to <strong>reveal</strong> the code and <strong>copy</strong> it automatically.</li>
                                            <li>Hover over cards on desktop to see additional actions like copying username or editing.</li>
                                        </ul>
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400"><ShieldCheck size={16} /></div>
                                            Security
                                        </h3>
                                        {DIS_PIN ? (
                                            <div className="ml-9 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                                <p className="font-medium mb-1">Externally Secured Instance</p>
                                                <p className="text-xs">
                                                    This application is secured by your deployment's authentication layer. 
                                                    Access control is managed externally (e.g., Auth0, Cloudflare Access, or reverse proxy).
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="pl-9">
                                                    Your data is encrypted with AES-256 (PBKDF2 Derived Key) using your PIN.
                                                    <span className="text-red-500 font-medium ml-1">Do not forget your PIN</span>.
                                                </p>
                                                <div className="ml-9 mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-100 dark:border-yellow-900/30 flex gap-2 items-start">
                                                    <Clock size={16} className="mt-0.5 shrink-0" />
                                                    <span><strong>Auto-Lock:</strong> Application will automatically lock after {currentAutoLockDuration === 0 ? 'never' : `${currentAutoLockDuration} seconds`} of inactivity.</span>
                                                </div>
                                            </>
                                        )}
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded text-orange-600 dark:text-orange-400"><Database size={16} /></div>
                                            Data & Storage
                                        </h3>
                                        <div className="ml-9 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <p className="mb-2"><strong>Current Usage:</strong> {storageStats.formatted}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                This application uses browser LocalStorage (~5MB limit). Designed for personal use.
                                            </p>
                                        </div>
                                    </section>
                                </div>

                                <div className="p-4 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-center">
                                    <button
                                        onClick={() => setShowHelp(false)}
                                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-brand-500/20"
                                    >
                                        Got it
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default App;