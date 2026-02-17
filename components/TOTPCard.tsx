import React, { useEffect, useState } from 'react';
import { TOTPAccount } from '../types';
import { generateToken } from '../services/totpService';
import { Copy, Check, Trash2, Lock, Key, User, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TOTPCardProps {
  account: TOTPAccount;
  onDelete: (id: string) => void;
  onEdit: (account: TOTPAccount) => void;
  isPreview?: boolean;
  autoReveal?: boolean;
  showNextCode?: boolean;
}

const TOTPCard: React.FC<TOTPCardProps> = ({ 
    account, 
    onDelete, 
    onEdit,
    isPreview = false, 
    autoReveal = true,
    showNextCode = false 
}) => {
  const [code, setCode] = useState<string>('--- ---');
  const [nextCode, setNextCode] = useState<string>('--- ---');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [period, setPeriod] = useState<number>(30);
  
  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNextCode, setCopiedNextCode] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(false);
  
  const [showDelete, setShowDelete] = useState(false);
  const [isRevealed, setIsRevealed] = useState(autoReveal);

  const hasSecret = !!account.secret;
  const hasPassword = !!account.password;
  const hasLabel = !!account.label;

  // Sync isRevealed state if prop changes
  useEffect(() => {
    setIsRevealed(autoReveal);
  }, [autoReveal]);

  useEffect(() => {
    if (!hasSecret) return;

    const update = () => {
      // Current Code
      const data = generateToken(account, 0);
      
      if (data) {
        let formatted = data.token;
        if (formatted.length === 6) {
            formatted = `${formatted.slice(0, 3)} ${formatted.slice(3)}`;
        }
        setCode(formatted);
        setTimeLeft(data.timeLeft);
        setPeriod(data.period);
      }

      // Next Code
      if (showNextCode) {
        const nextData = generateToken(account, 1);
        if (nextData) {
            let formattedNext = nextData.token;
            if (formattedNext.length === 6) {
                formattedNext = `${formattedNext.slice(0, 3)} ${formattedNext.slice(3)}`;
            }
            setNextCode(formattedNext);
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [account, showNextCode, hasSecret]);

  const performCopyCode = () => {
    if (!hasSecret) return;
    navigator.clipboard.writeText(code.replace(/\s/g, ''));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const performCopyPassword = () => {
    if (!account.password) return;
    navigator.clipboard.writeText(account.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyLabel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account.label) return;
    navigator.clipboard.writeText(account.label);
    setCopiedLabel(true);
    setTimeout(() => setCopiedLabel(false), 2000);
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    performCopyCode();
  };

  const handleCopyNextCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasSecret) return;
    navigator.clipboard.writeText(nextCode.replace(/\s/g, ''));
    setCopiedNextCode(true);
    setTimeout(() => setCopiedNextCode(false), 2000);
  };

  const handleCopyPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    performCopyPassword();
  };

  // Card click: Trigger main copy (TOTP preferred, then Password)
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent copy if clicking buttons or delete
    // (Handled by stopPropagation on those elements)
    
    if (!isRevealed && !autoReveal) {
        setIsRevealed(true);
    }
    
    if (hasSecret) {
        performCopyCode();
    } else if (hasPassword) {
        performCopyPassword();
    }
  };

  const progress = hasSecret ? (timeLeft / period) * 100 : 0;
  const redMix = hasSecret ? Math.min(100, Math.max(0, ((period - timeLeft) / period) * 100)) : 0;
  
  const lineColor = `color-mix(in srgb, #0ea5e9, #ef4444 ${redMix}%)`;
  const codeColor = isRevealed ? `color-mix(in srgb, currentColor, #ef4444 ${redMix}%)` : undefined;
  
  const actionBtnClass = "p-2 rounded-full text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={handleCardClick}
      className={`
        bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 
        relative overflow-hidden group select-none cursor-pointer h-full flex flex-col justify-between
        hover:shadow-lg dark:hover:border-brand-500/30 hover:border-brand-200 transition-all duration-300
        ${isPreview ? 'opacity-90' : ''}
      `}
    >
      <div className="p-5 flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate text-base flex items-center gap-2">
                {account.issuer}
                {!hasSecret && hasPassword && (
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">PWD</span>
                )}
            </h3>
            {/* Additional Info / Label */}
            <p className="text-xs font-medium text-gray-400 truncate mb-3 min-h-[1.25rem] group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors">
              {account.label}
            </p>
            
            {/* Main Code Display */}
            <div className="flex flex-col gap-2">
                {hasSecret ? (
                    <div 
                        className={`text-3xl font-mono font-bold tracking-widest transition-colors duration-500 ${!isRevealed ? 'text-gray-300 dark:text-gray-600 blur-[2px]' : ''}`}
                        style={{ color: isRevealed ? codeColor : undefined }}
                    >
                        {isRevealed ? code : '000 000'}
                    </div>
                ) : (
                    <div className="text-xl text-gray-500 font-mono tracking-widest py-1">
                        {hasPassword ? '••••••••••' : 'No Data'}
                    </div>
                )}
            </div>

            {/* Next Code Section */}
            <AnimatePresence>
                {showNextCode && hasSecret && isRevealed && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 mt-3 text-gray-400/80 cursor-pointer group/next"
                        onClick={handleCopyNextCode}
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Next</span>
                        <motion.span 
                            key={nextCode}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-mono text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 group-hover/next:text-brand-500 transition-colors"
                        >
                            {nextCode}
                        </motion.span>
                        <div className="p-1">
                            {copiedNextCode ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="group-hover/next:text-brand-500 transition-colors" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isRevealed && <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-2 block font-medium">Click to reveal</span>}
        </div>

        {/* Right Side: Numeric Timer & Actions */}
        <div className="flex flex-col items-end gap-1">
             {hasSecret ? (
                 <div className="flex items-center justify-center w-10 h-10 mb-1">
                    <span className="text-2xl font-bold tabular-nums" style={{ color: isRevealed ? codeColor : 'gray' }}>
                        {timeLeft}
                    </span>
                 </div>
             ) : (
                <div className="w-10 h-10 flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-full mb-1"><Lock size={18} /></div>
             )}

            <div className="flex flex-wrap justify-end gap-1 max-w-[120px]">
                {/* Copy Label/User */}
                {hasLabel && isRevealed && (
                <button 
                    onClick={handleCopyLabel} 
                    className={actionBtnClass}
                    title="Copy Username"
                >
                    {copiedLabel ? <Check size={18} className="text-green-500" /> : <User size={18} />}
                </button>
                )}

                {/* Copy Code */}
                {hasSecret && isRevealed && (
                <button 
                    onClick={handleCopyCode} 
                    className={actionBtnClass}
                    title="Copy Code"
                >
                    {copiedCode ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
                )}

                {/* Copy Password */}
                {hasPassword && isRevealed && (
                    <button 
                    onClick={handleCopyPassword} 
                    className={actionBtnClass}
                    title="Copy Password"
                    >
                    {copiedPassword ? <Check size={18} className="text-green-500" /> : <Key size={18} />}
                </button>
                )}

                {!isPreview && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(account); }} 
                        className={actionBtnClass}
                        title="Edit Account"
                    >
                        <Edit2 size={18} />
                    </button>
                )}
                {!isPreview && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowDelete(!showDelete); }} 
                        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Account"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Linear Timer Bar at Bottom */}
      {hasSecret && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-700">
            <div 
                className="h-full transition-all duration-1000 ease-linear"
                style={{ 
                    width: `${progress}%`,
                    backgroundColor: lineColor
                }}
            />
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
          {showDelete && !isPreview && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
                animate={{ opacity: 1, backdropFilter: "blur(4px)" }} 
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 bg-white/80 dark:bg-gray-800/90 flex flex-col items-center justify-center gap-3 text-gray-900 dark:text-white z-20"
                onClick={(e) => e.stopPropagation()}
              >
                  <span className="font-semibold text-sm">Delete this account?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDelete(false)} className="px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">Cancel</button>
                    <button onClick={() => onDelete(account.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-md transition">Delete</button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TOTPCard;