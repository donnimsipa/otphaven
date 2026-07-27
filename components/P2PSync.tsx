import React from 'react';
import { Wifi, ArrowRight, CheckCircle, AlertCircle, Loader2, Send, RefreshCw, Activity } from 'lucide-react';
import { ConnectionStatus } from '../services/p2pService';
import { motion, AnimatePresence } from 'framer-motion';

export interface P2PSyncProps {
  onBack: () => void;
  p2pMode: 'host' | 'join';
  setP2pMode: (mode: 'host' | 'join') => void;
  p2pStatus: ConnectionStatus;
  p2pStatusMsg: string;
  p2pRoomCode: string;
  p2pInputCode: string;
  setP2pInputCode: (code: string) => void;
  p2pLogs: string[];
  p2pLastSyncTime: Date | null;
  p2pPendingDeltas: number;
  handleCreateRoom: () => void;
  handleJoinRoom: (code: string) => void;
  handleSend: () => void;
  handleDisconnect: () => void;
}

const P2PSync: React.FC<P2PSyncProps> = ({
  p2pMode,
  setP2pMode,
  p2pStatus,
  p2pStatusMsg,
  p2pRoomCode,
  p2pInputCode,
  setP2pInputCode,
  p2pLogs,
  p2pLastSyncTime,
  p2pPendingDeltas,
  handleCreateRoom,
  handleJoinRoom,
  handleSend,
  handleDisconnect,
}) => {

  // Format status with icon and color
  const getStatusDisplay = () => {
    switch (p2pStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-500 font-bold">
            <CheckCircle size={20} />
            Connected
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-2 text-blue-500 font-bold">
            <RefreshCw className="animate-spin" size={20} />
            Syncing...
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center gap-2 text-yellow-500 font-bold">
            <RefreshCw className="animate-spin" size={20} />
            Reconnecting...
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2 text-yellow-500 font-bold">
            <Loader2 className="animate-spin" size={20} />
            Connecting...
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <AlertCircle size={20} />
            Error
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500 font-bold">
            <AlertCircle size={20} />
            Disconnected
          </div>
        );
    }
  };

  // Get connection status color for status bar
  const getStatusColor = () => {
    switch (p2pStatus) {
      case 'connected': return 'bg-green-500';
      case 'syncing': return 'bg-blue-500';
      case 'reconnecting': return 'bg-yellow-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const onJoinClick = () => {
    handleJoinRoom(p2pInputCode);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
         <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="text-brand-500" /> P2P Sync
         </h2>
      </div>

      {/* Connection Status Bar */}
      <div className="mb-6 p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusDisplay()}
              {p2pStatusMsg && <span className="text-xs text-gray-500 ml-2">• {p2pStatusMsg}</span>}
            </div>
            {p2pLastSyncTime && (
              <div className="text-xs text-gray-500">
                Last sync: {p2pLastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700">
            <div className={`w-full h-full rounded-full ${getStatusColor()} animate-pulse`}></div>
          </div>
        </div>
        {p2pPendingDeltas > 0 && (
          <div className="mt-2 text-xs text-blue-500 flex items-center gap-1">
            <Activity size={12} />
            {p2pPendingDeltas} pending update(s)
          </div>
        )}
      </div>

      <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-6">
        <button 
            onClick={() => { setP2pMode('host'); handleDisconnect(); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${p2pMode === 'host' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
        >
            Send (Host)
        </button>
        <button 
             onClick={() => { setP2pMode('join'); handleDisconnect(); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${p2pMode === 'join' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
        >
            Receive (Join)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
          {p2pMode === 'host' ? (
              <div className="text-center space-y-6">
                  {!p2pRoomCode ? (
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
                              {p2pRoomCode}
                          </div>
                          
                          <div className="flex justify-center mt-4">
                              {p2pStatus === 'connecting' && <span className="flex items-center gap-2 text-yellow-500"><Loader2 className="animate-spin" /> Waiting for peer...</span>}
                              {p2pStatus === 'connected' && <span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle /> Peer Connected</span>}
                          </div>
                          
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Continuous Sync Active:</strong> Changes are automatically synced in real-time. No need to manually send data.
                              </p>
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
                                 value={p2pInputCode}
                                 onChange={(e) => setP2pInputCode(e.target.value)}
                                 placeholder="e.g. 1234"
                                 className="flex-1 p-3 text-lg font-mono tracking-widest text-center border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-brand-500 uppercase"
                                 maxLength={4}
                             />
                             <button 
                                 onClick={onJoinClick}
                                 disabled={p2pStatus === 'connected' || p2pInputCode.length < 4}
                                 className="bg-brand-600 disabled:opacity-50 text-white px-4 rounded-lg hover:bg-brand-700 transition"
                             >
                                 <ArrowRight />
                             </button>
                        </div>
                   </div>
                   <div className="flex justify-center">
                        {p2pStatus === 'connecting' && <span className="flex items-center gap-2 text-yellow-500"><Loader2 className="animate-spin" /> Connecting...</span>}
                        {p2pStatus === 'connected' && <span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle /> Connected to Host</span>}
                        {p2pStatus === 'error' && <span className="flex items-center gap-2 text-red-500"><AlertCircle /> Connection Failed</span>}
                   </div>
                   
                   <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Continuous Sync Active:</strong> Changes on the host will be automatically synced to your device.
                        </p>
                   </div>
              </div>
          )}

          {/* Actions when Connected */}
          <AnimatePresence>
            {p2pStatus === 'connected' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800 text-center space-y-3">
                    <h3 className="font-semibold text-brand-900 dark:text-brand-100">Real-Time Sync Active</h3>
                    <p className="text-sm text-brand-700 dark:text-brand-300">Both devices are connected. Changes are automatically synchronized.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={handleSend} className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 flex items-center gap-2">
                            <Send size={18} /> Push Full Vault
                        </button>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

          {/* Logs */}
          <div className="mt-8">
              <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Connection Log</h4>
              <div className="bg-black text-green-400 font-mono text-xs p-3 rounded-lg h-32 overflow-y-auto">
                  {p2pLogs.length === 0 && <span className="opacity-50">Log empty...</span>}
                  {p2pLogs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
          </div>
      </div>
    </div>
  );
};

export default P2PSync;
