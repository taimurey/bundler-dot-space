import React from 'react';
import Image from 'next/image';
import SpaceLogo from '@/public/bundler.svg';

const BundlerLogo: React.FC<{ width?: number; height?: number; className?: string }> = ({
    width = 40,
    height = 40,
    className = ""
}) => {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Image
                src={SpaceLogo}
                width={width}
                height={height}
                alt="Bundler.Space"
                className="filter brightness-0 invert"
            />
            <span className="ml-2 text-xl font-semibold text-white">Bundler.Space</span>
        </div>
    );
};

export default BundlerLogo; 