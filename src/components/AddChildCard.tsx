
import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddChildCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="xoul-card hover:shadow-lg hover:translate-y-[-2px] cursor-pointer border-dashed border-white/20 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-all"
      onClick={() => navigate('/add-child')}
    >
      <Plus size={32} className="text-xoul-accent mb-2" />
      <p className="text-body">Add new child</p>
    </div>
  );
};

export default AddChildCard;
