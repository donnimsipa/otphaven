import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface ScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Small timeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            
            scanner.render((decodedText) => {
                scanner.clear();
                onScan(decodedText);
                // onClose will be called by parent after successful save
            }, (errorMessage) => {
               // Ignore scan errors, they happen every frame
            });
            scannerRef.current = scanner;
        } catch (e) {
            setError("Failed to initialize camera. Please check permissions.");
        }
    }, 100);

    return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
        }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"
        >
            <X size={24} />
        </button>
        <div id="reader" className="w-full max-w-sm bg-black rounded-lg overflow-hidden border border-gray-700"></div>
        <p className="mt-4 text-gray-400 text-sm text-center">
            {error ? error : "Point camera at a QR code"}
        </p>
    </div>
  );
};

export default Scanner;
