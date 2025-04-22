
import React from 'react';
import { useChildren } from '@context/ChildrenContext';
import ChildCard from '@components/ChildCard';
import AddChildCard from '@components/AddChildCard';

const Dashboard: React.FC = () => {
  const { children, isLoading } = useChildren();

  return (
    <div className="container max-w-5xl mx-auto px-6 py-12 page-transition">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-10">Monitor and manage your children's digital well-being</p>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-[#1e2330] border border-white/5 rounded-xl p-5 animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
              <div className="h-4 w-full bg-white/10 rounded mb-3"></div>
              <div className="h-4 w-full bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map(child => (
            <ChildCard key={child.id} child={child} />
          ))}
          <AddChildCard />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
