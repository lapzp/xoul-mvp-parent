
import React, { useState, useEffect } from 'react';
import { Check, Smartphone, MessageCircle } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface PairingCardProps {
  title: string;
  description: string;
  type: 'phone' | 'whatsapp';
  isPaired: boolean;
  onPair: () => Promise<string>;
  onUnpair: () => Promise<void>;
}

const PairingCard: React.FC<PairingCardProps> = ({
  title,
  description,
  type,
  isPaired,
  onPair,
  onUnpair
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [localIsPaired, setLocalIsPaired] = useState(isPaired);

  // Reset local state when props change
  useEffect(() => {
    setLocalIsPaired(isPaired);
  }, [isPaired]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const generatedCode = await onPair();
      setCode(generatedCode);
      setShowTimer(true);
      
      // Simulate successful pairing after 6-10 seconds
      const pairingDelay = Math.floor(Math.random() * (10 - 6 + 1)) + 6;
      setTimeout(() => {
        setLocalIsPaired(true);
      }, pairingDelay * 1000);
      
    } catch (error) {
      console.error('Failed to generate code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnpair = async () => {
    try {
      await onUnpair();
      setLocalIsPaired(false);
      setCode(null);
      setShowTimer(false);
    } catch (error) {
      console.error('Failed to unpair:', error);
    }
  };

  const handleTimerComplete = () => {
    setCode(null);
    setShowTimer(false);
  };

  return (
    <div className="bg-[#1a1f2c] rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        {type === 'phone' ? 
          <Smartphone className="text-blue-400" size={20} /> : 
          <MessageCircle className="text-blue-400" size={20} />
        }
        <h3 className="heading-md">{title}</h3>
      </div>
      <p className="text-body mb-8">{description}</p>

      {localIsPaired ? (
        <>
          <div className="mt-auto bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-md mb-4 text-center">
            <span className="flex items-center justify-center gap-2">
              <span className="text-green-400">✓</span> Pairing complete
            </span>
          </div>
          <button 
            className="py-3 w-full bg-[#1e2330] hover:bg-opacity-80 rounded-md transition-colors"
            onClick={handleUnpair}
          >
            Unpair
          </button>
        </>
      ) : (
        <div className="flex flex-col mt-auto">
          {code ? (
            <div className="flex flex-col items-center my-4">
              {type === 'phone' ? (
                <div className="text-xl font-bold text-white tracking-widest bg-[#1e2330] p-4 rounded-lg my-2">
                  {code}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg my-2">
                  {/* Placeholder for QR code - in real app would use a QR code library */}
                  <div className="w-32 h-32 border-2 border-[#1e2330] grid grid-cols-4 grid-rows-4 gap-1">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`${Math.random() > 0.5 ? 'bg-[#1e2330]' : 'bg-white'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {showTimer && (
                <CountdownTimer 
                  duration={30} 
                  onComplete={handleTimerComplete} 
                  className="w-full mt-2"
                />
              )}
            </div>
          ) : (
            <button 
              className="py-3 w-full bg-[#1e2330] hover:bg-opacity-80 rounded-md transition-colors"
              onClick={handleGenerateCode}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : type === 'phone' ? 'Generate pairing code' : 'Generate WhatsApp QR code'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PairingCard;
