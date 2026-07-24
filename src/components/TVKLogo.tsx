import React from 'react';
import tvkLogoImage from '@/assets/tvk-logo.jpeg';

interface TVKLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const TVKLogo: React.FC<TVKLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden`}>
      <img 
        src={tvkLogoImage} 
        alt="TVK Logo - தமிழக வெற்றி கழகம்" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default TVKLogo;
