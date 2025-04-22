import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusIndicator from './StatusIndicator';
import { ArrowRight, User, Calendar } from 'lucide-react';

export interface ChildData {
  id: string | number;
  name: string;
  phoneConnected: boolean;
  whatsappConnected: boolean;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  adult_id?: number;
  created_at?: string;
  updated_at?: string;
  alias?: string;
}

interface ChildCardProps {
  child: ChildData;
}

const ChildCard: React.FC<ChildCardProps> = ({ child }) => {
  const navigate = useNavigate();

  const formatGender = (gender?: 'male' | 'female' | 'other') => {
    if (!gender) return 'Unknown';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  return (
    <div 
      className="bg-[#1e2330] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all cursor-pointer relative"
      onClick={() => navigate(`/child/${child.id}`)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">{child.name}</h3>
        <ArrowRight size={20} className="text-gray-500" />
      </div>
      
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center text-sm text-gray-400">
          <Calendar size={14} className="mr-2" />
          <span>Age: {child.age !== undefined ? child.age : 'Not specified'}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-400">
          <User size={14} className="mr-2" />
          <span>Gender: {formatGender(child.gender)}</span>
        </div>

        {child.alias && (
          <div className="mt-1 text-xs font-mono bg-gray-800 rounded p-1 inline-block text-gray-300">
            Code: {child.alias}
          </div>
        )}
      </div>
      
      <StatusIndicator isConnected={child.phoneConnected} label="Phone" />
      <StatusIndicator isConnected={child.whatsappConnected} label="WhatsApp" />
    </div>
  );
};

export default ChildCard;
