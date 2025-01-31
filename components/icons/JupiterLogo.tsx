import React from 'react';
import Image from 'next/image';
import SpaceLogo from '@/public/boxlogo.png'

const MevLabLogo: React.FC<{ width?: number; height?: number }> = ({ width = 45, height = 45 }) => {
  return (
    <Image
      src={SpaceLogo}
      width={width}
      height={height}
      alt="Jupiter aggregator"
    />
  );
};

export default MevLabLogo;