
import React from 'react';
import { Smartphone, MessageCircle } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  label: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isConnected, label }) => {
  const Icon = label === 'Phone' ? Smartphone : MessageCircle;
  
  return (
    <div className="flex items-center gap-3 my-3">
      <Icon size={18} className="text-gray-400" />
      <div className="flex items-center">
        <span className="text-gray-400">{label}</span>
      </div>
      <div className={`ml-auto ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} px-3 py-1 rounded-full text-xs font-medium`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
};

export default StatusIndicator;
