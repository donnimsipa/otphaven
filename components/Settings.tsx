import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, DecryptedVault, TOTPAccount } from '../types';
import { Save, Cloud, Radio, WifiOff, Download, Upload, Moon, Sun, Monitor, FileText, Check, Eye, EyeOff, FastForward, Lock, FileJson, Clock, Database, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { decryptBackup, encryptBackup, getStorageUsage } from '../services/cryptoService';

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onImport: (vaultData: DecryptedVault) => void;
  vault: DecryptedVault;
  disablePin?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onImport, vault, disablePin = false }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [storageStats, setStorageStats] = useState({ usedBytes: 0, limitBytes: 0, percent: 0, formatted: '' });
  
  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStorageStats(getStorageUsage());
  }, [vault]); // Recalculate if vault props change

  const handleSave = () => {
    onSave(localSettings);
  };

  // --- Export Logic ---
  const handleExportClick = () => {
      setShowExportModal(true);
      setExportPassword('');
  };

  const performExport = (isEncrypted: boolean) => {
    let payload = '';
    let filename = `otphaven-backup-${Date.now()}`;
    
    if (isEncrypted) {
        if (exportPassword.length < 4) {
            setErrorMsg("Password must be at least 4 chars");
            return;
        }
        payload = encryptBackup(vault, exportPassword);
        filename += '.enc'; // Changed to .enc for v2
    } else {
        payload = JSON.stringify(vault, null, 2);
        filename += '.json';
    }

    const blob = new Blob([payload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    // Append to body for iOS Firefox compatibility
    document.body.appendChild(a);
    a.click();
    
    // Cleanup after a short delay
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    setShowExportModal(false);
    setErrorMsg('');
  };

  // --- Import Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const content = ev.target?.result as string;
        try {
            // Try parsing as JSON first (Raw/Legacy)
            const data = JSON.parse(content);
            if (data.accounts) {
                // It's a valid vault structure
                if(confirm("Import unencrypted backup? This will overwrite existing settings.")) {
                    onImport(data);
                }
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        } catch (e) {
            // Not JSON? Might be encrypted string or invalid
        }
        
        // If we are here, it's either encrypted string or invalid garbage
        // We assume it's encrypted and ask for password
        setPendingImportContent(content);
        setShowImportModal(true);
        setImportPassword('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const performEncryptedImport = () => {
      if (!pendingImportContent) return;
      try {
          const decrypted = decryptBackup(pendingImportContent, importPassword);
          if (decrypted && decrypted.accounts) {
              onImport(decrypted);
              setShowImportModal(false);
              setPendingImportContent(null);
              alert("Encrypted backup imported successfully!");
          } else {
              setErrorMsg("Decryption successful but invalid vault format.");
          }
      } catch (e) {
          setErrorMsg("Incorrect password or corrupt file.");
      }
  };

  // --- Template Download ---
  const downloadTemplate = () => {
      const template = {
          accounts: [
              {
                  id: "example-id-1",
                  issuer: "Example Service",
                  label: "user@example.com",
                  secret: "JBSWY3DPEHPK3PXP",
                  password: "OptionalPassword123",
                  category: "Personal",
                  algorithm: "SHA1",
                  digits: 6,
                  period: 30
              }
          ],
          settings: settings
      };
      
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'import_template.json';
      a.click();
      URL.revokeObjectURL(url);
  };

  const themeOptionClass = (isActive: boolean) => 
    `flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
        isActive 
        ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' 
        : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="p-4 space-y-6 pb-24 relative">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>

      {/* Storage Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Database size={16} className="text-brand-500" /> Storage Usage
          </h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
             <div 
                className={`h-2.5 rounded-full ${storageStats.percent > 90 ? 'bg-red-500' : 'bg-brand-500'}`} 
                style={{ width: `${Math.min(100, storageStats.percent)}%` }}
             ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
             <span>{storageStats.formatted} used</span>
             <span>Browser LocalStorage (~5MB)</span>
          </div>
          <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded flex gap-2">
             <AlertTriangle size={14} className="shrink-0 mt-0.5" />
             This app is designed for personal, small-scale use. Do not store thousands of accounts.
          </p>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Appearance</h3>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button 
                onClick={() => setLocalSettings(s => ({ ...s, theme: 'light' }))}
                className={themeOptionClass(localSettings.theme === 'light')}
            >
                <Sun size={16} /> Light
            </button>
            <button 
                onClick={() => setLocalSettings(s => ({ ...s, theme: 'dark' }))}
                className={themeOptionClass(localSettings.theme === 'dark')}
            >
                <Moon size={16} /> Dark
            </button>
            <button 
                onClick={() => setLocalSettings(s => ({ ...s, theme: 'system' }))}
                className={themeOptionClass(localSettings.theme === 'system')}
            >
                <Monitor size={16} /> System
            </button>
        </div>
      </div>

      {/* Display Options */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Display & Security</h3>
        
        {/* Auto Reveal */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    {localSettings.autoReveal ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
                <div>
                    <div className="font-medium">Auto-Reveal Code</div>
                    <div className="text-xs text-gray-500">Show codes automatically without clicking.</div>
                </div>
            </div>
            <button
                onClick={() => setLocalSettings(s => ({ ...s, autoReveal: !s.autoReveal }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.autoReveal ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${localSettings.autoReveal ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>

        {/* Show Next Code */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    <FastForward size={18} />
                </div>
                <div>
                    <div className="font-medium">Show Next Code</div>
                    <div className="text-xs text-gray-500">Display the code for the upcoming period.</div>
                </div>
            </div>
            <button
                onClick={() => setLocalSettings(s => ({ ...s, showNextCode: !s.showNextCode }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.showNextCode ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${localSettings.showNextCode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>

        {/* Auto Lock Duration - Hidden in No-PIN mode */}
        {!disablePin && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                        <Clock size={18} />
                    </div>
                    <div>
                        <div className="font-medium">Auto Lock</div>
                        <div className="text-xs text-gray-500">Time before locking vault.</div>
                    </div>
                </div>
                <select 
                    value={localSettings.autoLockDuration ?? 60}
                    onChange={(e) => setLocalSettings(s => ({ ...s, autoLockDuration: parseInt(e.target.value) }))}
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:border-brand-500"
                >
                    <option value={0}>Never</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>1 Minute</option>
                    <option value={300}>5 Minutes</option>
                    <option value={600}>10 Minutes</option>
                </select>
            </div>
        )}
      </div>

      {/* Sync Method */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Sync Method</h3>
        <div className="space-y-3">
          
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${localSettings.syncMethod === 'offline' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700'}`}>
            <input 
              type="radio" 
              name="sync" 
              className="hidden" 
              checked={localSettings.syncMethod === 'offline'} 
              onChange={() => setLocalSettings(s => ({ ...s, syncMethod: 'offline' }))} 
            />
            <WifiOff size={20} className={localSettings.syncMethod === 'offline' ? 'text-brand-500' : 'text-gray-400'} />
            <div>
              <div className="font-medium">Offline / Manual</div>
              <div className="text-xs text-gray-500">No data leaves device automatically.</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${localSettings.syncMethod === 'nostr' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700'}`}>
            <input 
              type="radio" 
              name="sync" 
              className="hidden" 
              checked={localSettings.syncMethod === 'nostr'} 
              onChange={() => setLocalSettings(s => ({ ...s, syncMethod: 'nostr' }))} 
            />
            <Radio size={20} className={localSettings.syncMethod === 'nostr' ? 'text-purple-500' : 'text-gray-400'} />
            <div>
              <div className="font-medium">Nostr Sync</div>
              <div className="text-xs text-gray-500">Decentralized sync via relays.</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${localSettings.syncMethod === 's3' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700'}`}>
            <input 
              type="radio" 
              name="sync" 
              className="hidden" 
              checked={localSettings.syncMethod === 's3'} 
              onChange={() => setLocalSettings(s => ({ ...s, syncMethod: 's3' }))} 
            />
            <Cloud size={20} className={localSettings.syncMethod === 's3' ? 'text-orange-500' : 'text-gray-400'} />
            <div>
              <div className="font-medium">S3 Backup</div>
              <div className="text-xs text-gray-500">Sync with your own cloud bucket.</div>
            </div>
          </label>
        </div>
      </div>

      {/* S3 Config */}
      {localSettings.syncMethod === 's3' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-3">
          <h4 className="font-semibold text-sm uppercase text-gray-500">S3 Configuration</h4>
          <input 
            type="text" placeholder="Endpoint" 
            className="w-full bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 outline-none focus:border-brand-500"
            value={localSettings.s3Config?.endpoint || ''}
            onChange={e => setLocalSettings(s => ({ ...s, s3Config: { ...s.s3Config!, endpoint: e.target.value } }))}
          />
          <div className="flex gap-2">
            <input 
              type="text" placeholder="Access Key" 
              className="w-1/2 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 outline-none focus:border-brand-500"
              value={localSettings.s3Config?.accessKey || ''}
              onChange={e => setLocalSettings(s => ({ ...s, s3Config: { ...s.s3Config!, accessKey: e.target.value } }))}
            />
            <input 
              type="password" placeholder="Secret Key" 
              className="w-1/2 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 outline-none focus:border-brand-500"
              value={localSettings.s3Config?.secretKey || ''}
              onChange={e => setLocalSettings(s => ({ ...s, s3Config: { ...s.s3Config!, secretKey: e.target.value } }))}
            />
          </div>
          <input 
            type="text" placeholder="Bucket Name" 
            className="w-full bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600 outline-none focus:border-brand-500"
            value={localSettings.s3Config?.bucket || ''}
            onChange={e => setLocalSettings(s => ({ ...s, s3Config: { ...s.s3Config!, bucket: e.target.value } }))}
          />
        </motion.div>
      )}

      {/* Manual Backup Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Data Management</h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportClick} className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                <Download size={24} className="mb-2 text-brand-500" />
                <span className="text-sm font-medium">Backup</span>
            </button>
            <label className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer">
                <Upload size={24} className="mb-2 text-brand-500" />
                <span className="text-sm font-medium">Restore</span>
                <input ref={fileInputRef} type="file" accept=".json,.enc" className="hidden" onChange={handleFileChange} />
            </label>
        </div>
        
        <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-center">
             <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500 transition"
            >
                <FileJson size={16} /> Download Import Template
             </button>
        </div>
      </div>

      <button 
        onClick={handleSave} 
        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
      >
        <Save size={20} />
        Save Settings
      </button>

      {/* EXPORT MODAL */}
      <AnimatePresence>
        {showExportModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-2">Export Backup</h3>
                    <p className="text-sm text-gray-500 mb-4">Choose how you want to save your data.</p>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Encrypt with Password (Recommended)</label>
                            <input 
                                type="password" 
                                placeholder="Enter a strong password"
                                value={exportPassword}
                                onChange={(e) => setExportPassword(e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-brand-500"
                            />
                        </div>
                        
                        {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

                        <button 
                            onClick={() => performExport(true)}
                            className="w-full bg-brand-600 text-white py-2 rounded-lg font-semibold hover:bg-brand-700 transition flex items-center justify-center gap-2"
                        >
                            <Lock size={16} /> Export Encrypted (PBKDF2)
                        </button>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        </div>

                        <button 
                            onClick={() => performExport(false)}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg font-semibold hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center gap-2"
                        >
                            <FileText size={16} /> Export Raw JSON (Unsafe)
                        </button>
                    </div>
                    <button onClick={() => setShowExportModal(false)} className="mt-4 text-center w-full text-sm text-gray-500">Cancel</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* IMPORT PASSWORD MODAL */}
      <AnimatePresence>
        {showImportModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-2">Decrypt Backup</h3>
                    <p className="text-sm text-gray-500 mb-4">This file is encrypted. Enter password to restore.</p>
                    
                    <div className="space-y-3">
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={importPassword}
                            onChange={(e) => setImportPassword(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-brand-500"
                        />
                        {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}

                        <button 
                            onClick={performEncryptedImport}
                            className="w-full bg-brand-600 text-white py-2 rounded-lg font-semibold hover:bg-brand-700 transition"
                        >
                            Decrypt & Restore
                        </button>
                    </div>
                     <button onClick={() => setShowImportModal(false)} className="mt-4 text-center w-full text-sm text-gray-500">Cancel</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Settings;