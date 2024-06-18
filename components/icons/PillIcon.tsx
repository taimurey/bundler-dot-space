import React from 'react';

// Modify the interface to include the isActive prop
interface PillIconProps {
    rotate?: boolean;
    isActive?: boolean;
}

const PillIcon: React.FC<PillIconProps> = ({ rotate = false }) => {
    // Conditionally set the style based on the rotate prop
    const style = rotate ? { transform: 'rotate(90deg)' } : undefined;


    return (
        <svg width="25" height="25" fill="currentColor" viewBox="-0.003 0 99.979 99.979" xmlns="http://www.w3.org/2000/svg" style={style}>
            <path d="M92.869 7.105c9.478 9.476 9.478 24.832 0 34.308L41.411 92.869c-9.475 9.474-24.833 9.474-34.307 0-9.476-9.475-9.476-24.832 0-34.308L58.562 7.105c9.475-9.473 24.834-9.473 34.307 0z" />
            <path fill="#f0fcf1" fillOpacity="9" d="M32.548 33.122L7.105 58.563c-9.476 9.476-9.476 24.833 0 34.308 9.474 9.475 24.832 9.475 34.307 0L66.85 67.43 32.548 33.122z"
            />
            <path fill="#2086BF" d="M65.43 68.862L31.134 34.568l1.414-1.414 34.294 34.294z" />
            <path fill="#EFF0F1" d="M75.244 12.7a5.897 5.897 0 0 0-8.343 0L39.51 40.096l8.339 8.339 27.396-27.396a5.899 5.899 0 0 0-.001-8.339z" />
            <path fill="#4F9ED4" d="M47.862 48.444l-1.414 1.414-8.335-8.336 1.414-1.414z" />
        </svg>
    );
};

export default PillIcon;