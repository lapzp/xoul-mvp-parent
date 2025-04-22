
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  };

  return (
    <Link to="/dashboard" className={`flex items-center ${className}`}>
      <img 
        src="/lovable-uploads/d615498e-67a4-47fd-969e-e2130b50c526.png" 
        alt="XOUL" 
        className={`${sizeClasses[size]}`}
      />
    </Link>
  );
};

export default Logo;
