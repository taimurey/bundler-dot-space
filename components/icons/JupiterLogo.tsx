import React from 'react';
import Image from 'next/image';
import SpaceLogo from '@/public/bundler.svg'

const MevLabLogo: React.FC<{ width?: number; height?: number }> = ({ width = 35, height = 35 }) => {
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