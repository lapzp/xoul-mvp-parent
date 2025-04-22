
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  duration, 
  onComplete,
  className = '' 
}) => {
  const [seconds, setSeconds] = useState(duration);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  // Calculate progress percentage
  const progress = (seconds / duration) * 100;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
        <div 
          className="absolute top-0 left-0 h-full bg-xoul-accent transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-small">Expires in {seconds} seconds</p>
    </div>
  );
};

export default CountdownTimer;
