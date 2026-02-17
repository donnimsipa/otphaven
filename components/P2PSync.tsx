import React, { useState, useEffect, useRef } from 'react';
import { Wifi, ArrowRight, CheckCircle, AlertCircle, Loader2, Send, Download } from 'lucide-react';
import { P2PService, ConnectionStatus } from '../services/p2pService';
import { DecryptedVault } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface P2PSyncProps {
  currentVault: DecryptedVault;
  onMerge: (remoteVault: DecryptedVault) => void;
  onBack: () => void;
}

const P2PSync: React.FC<P2PSyncProps> = ({ currentVault, onMerge, onBack }) => {
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMsg, setStatusMsg] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // We use a ref to persist the service instance across renders
  const serviceRef = useRef<P2PService | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new P2PService(
      (newStatus, msg) => {
        setStatus(newStatus);
        if (msg) setStatusMsg(msg);
        addLog(`Status: ${newStatus} ${msg || ''}`);
      },
      (data) => {
        addLog("Received Vault Data. Merging...");
        onMerge(data);
        addLog("Merge Complete.");
        alert("Sync Successful! Data merged.");
      }
    );

    return () => {
      serviceRef.current?.destroy();
    };
  }, [onMerge]);

  const handleCreateRoom = async () => {
    if (!serviceRef.current) return;
    try {
      setLogs([]);
      const code = await serviceRef.current.initHost();
      setRoomCode(code);
      addLog(`Room Created: ${code}`);
    } catch (e) {
      addLog("Failed to create room.");
    }
  };

  const handleJoinRoom = () => {
    if (!serviceRef.current || inputCode.length !== 4) return;
    setLogs([]);
    serviceRef.current.join(inputCode);
  };

  const handleSend = () => {
    if (!serviceRef.current || status !== 'connected') return;
    serviceRef.current.sendVault(currentVault);
    addLog("Sent local vault data.");
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
         <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="text-brand-500" /> P2P Sync
         </h2>
      </div>

      <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-6">
        <button 
            onClick={() => { setMode('host'); serviceRef.current?.destroy(); setStatus('disconnected'); setRoomCode(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'host' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
        >
            Send (Host)
        </button>
        <button 
             onClick={() => { setMode('join'); serviceRef.current?.destroy(); setStatus('disconnected'); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === 'join' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
        >
            Receive (Join)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
          {mode === 'host' ? (
              <div className="text-center space-y-6">
                  {!roomCode ? (
                      <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                          <p className="mb-4 text-gray-500">Create a room to share your vault.</p>
                          <button onClick={handleCreateRoom} className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition">
                              Generate Room Code
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <p className="text-gray-500">Share this code with the other device:</p>
                          <div className="text-5xl font-mono font-bold tracking-widest text-brand-600 dark:text-brand-400 select-all">
                              {roomCode}
                          </div>
                          
                          <div className="flex justify-center mt-4">
                              {status === 'connecting' && <span className="flex items-center gap-2 text-yellow-500"><Loader2 className="animate-spin" /> Waiting for peer...</span>}
                              {status === 'connected' && <span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle /> Peer Connected</span>}
                          </div>
                      </div>
                  )}
              </div>
          ) : (
              <div className="space-y-6">
                   <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
                        <label className="block text-sm font-medium mb-2">Enter Room Code</label>
                        <div className="flex gap-2">
                            <input 
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                placeholder="e.g. 1234"
                                className="flex-1 p-3 text-lg font-mono tracking-widest text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-brand-500 uppercase"
                                maxLength={4}
                            />
                            <button 
                                onClick={handleJoinRoom}
                                disabled={status === 'connected' || inputCode.length < 4}
                                className="bg-brand-600 disabled:opacity-50 text-white px-4 rounded-lg hover:bg-brand-700 transition"
                            >
                                <ArrowRight />
                            </button>
                        </div>
                   </div>
                   <div className="flex justify-center">
                        {status === 'connecting' && <span className="flex items-center gap-2 text-yellow-500"><Loader2 className="animate-spin" /> Connecting...</span>}
                        {status === 'connected' && <span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle /> Connected to Host</span>}
                        {status === 'error' && <span className="flex items-center gap-2 text-red-500"><AlertCircle /> Connection Failed</span>}
                   </div>
              </div>
          )}

          {/* Actions when Connected */}
          <AnimatePresence>
            {status === 'connected' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800 text-center space-y-3">
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100">Ready to Sync</h3>
                    <p className="text-sm text-brand-700 dark:text-brand-300">Both devices are connected. Either device can send their vault data to the other.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleSend} className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 flex items-center gap-2">
                            <Send size={18} /> Push My Data
                        </button>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Logs */}
          <div className="mt-8">
              <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Connection Log</h4>
              <div className="bg-black text-green-400 font-mono text-xs p-3 rounded-lg h-32 overflow-y-auto">
                  {logs.length === 0 && <span className="opacity-50">Log empty...</span>}
                  {logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
          </div>
      </div>
    </div>
  );
};

export default P2PSync;