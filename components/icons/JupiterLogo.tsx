import React from 'react';
import Image from 'next/image';
import SpaceLogo from '../../public/spacelogo.png'

const JupiterLogo: React.FC<{ width?: number; height?: number }> = ({ width = 45, height = 45 }) => {
  return (
    <Image
      src={SpaceLogo}
      width={width}
      height={height}
      alt="Jupiter aggregator"
    />
  );
};

export default JupiterLogo;