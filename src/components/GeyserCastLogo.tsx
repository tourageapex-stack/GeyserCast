import React from 'react';

interface GeyserCastLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const GeyserCastLogo: React.FC<GeyserCastLogoProps> = ({
  className = 'w-10 h-10',
  size = 40,
  alt = '',
}) => (
  <img
    src="/logo.png"
    alt={alt}
    className={`flex-shrink-0 rounded-xl shadow-md ring-1 ring-amber-500/40 object-cover ${className}`}
    width={size}
    height={size}
    decoding="async"
  />
);
