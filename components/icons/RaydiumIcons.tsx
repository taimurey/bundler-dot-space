import React from 'react';
import Image from 'next/image';
import RaydiumAMMBuy from '@/public/RAYAMMBUY.svg'
import RaydiumAMMSell from '@/public/RAYAMMSELL.svg'
import RaydiumCPMMBuy from '@/public/RAYCPMMBUY.svg'
import RaydiumCPMMSell from '@/public/RAYCPMMSELL.svg'
import OpenBook from '@/public/openbook.svg'
interface RaydiumIconProps {
    className?: string;
}

const RaydiumIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <svg
            className={className}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M14.1936 6V11.5742L7.9957 15.1527L1.79355 11.5742V4.4129L7.9957 0.830107L12.7613 3.5828L13.4796 3.16989L7.9957 0L1.07527 3.9957V11.9871L7.9957 15.9828L14.9161 11.9871V5.5828L14.1936 6Z"
                fill="url(#paint0_linear_11713_725497)"
            />
            <path
                d="M6.25832 11.5741H5.22176V8.09457H8.67982C9.0067 8.09026 9.32068 7.95693 9.54864 7.72467C9.7809 7.49242 9.90993 7.17844 9.90993 6.85156C9.90993 6.68811 9.87982 6.52897 9.81961 6.37844C9.75509 6.2279 9.66477 6.09457 9.54864 5.98274C9.43681 5.86661 9.29918 5.77629 9.15294 5.71177C9.0024 5.64725 8.84326 5.61715 8.67982 5.61715H5.22176V4.55908H8.68412C9.29057 4.56338 9.87122 4.80424 10.297 5.23435C10.7271 5.66446 10.968 6.2451 10.9723 6.84725C10.9766 7.31177 10.8347 7.76338 10.568 8.14188C10.3228 8.50317 9.97444 8.78704 9.57014 8.95908C9.17014 9.08811 8.75294 9.14833 8.33143 9.14403H6.25832V11.5741Z"
                fill="url(#paint1_linear_11713_725497)"
            />
            <path
                d="M10.9505 11.4882H9.74194L8.8086 9.85807C9.17849 9.83656 9.54409 9.75914 9.89247 9.63871L10.9505 11.4882Z"
                fill="url(#paint2_linear_11713_725497)"
            />
            <path
                d="M13.471 4.83871L14.1893 5.23871L14.9032 4.84301V4.0043L14.1893 3.5914L13.4753 4.0043V4.83871H13.471Z"
                fill="url(#paint3_linear_11713_725497)"
            />
            <defs>
                <linearGradient
                    id="paint0_linear_11713_725497"
                    x1="15.5001"
                    y1="3.5"
                    x2="0.476774"
                    y2="11.9586"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#B50CFB" />
                    <stop offset="0.4897" stopColor="#3D6DFF" />
                    <stop offset="0.4898" stopColor="#3D6DFF" />
                    <stop offset="1" stopColor="#4DC5CA" />
                </linearGradient>
                <linearGradient
                    id="paint1_linear_11713_725497"
                    x1="16.0001"
                    y1="5"
                    x2="-0.216822"
                    y2="10.3415"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#B50CFB" />
                    <stop offset="0.4897" stopColor="#3D6DFF" />
                    <stop offset="0.4898" stopColor="#3D6DFF" />
                    <stop offset="1" stopColor="#4DC5CA" />
                </linearGradient>
                <linearGradient
                    id="paint2_linear_11713_725497"
                    x1="16"
                    y1="3.00004"
                    x2="1.77486"
                    y2="14.3509"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#B50CFB" />
                    <stop offset="0.4897" stopColor="#3D6DFF" />
                    <stop offset="0.4898" stopColor="#3D6DFF" />
                    <stop offset="1" stopColor="#4DC5CA" />
                </linearGradient>
                <linearGradient
                    id="paint3_linear_11713_725497"
                    x1="14.9474"
                    y1="4.10746"
                    x2="0.268277"
                    y2="9.97759"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#B50CFB" />
                    <stop offset="0.4897" stopColor="#3D6DFF" />
                    <stop offset="0.4898" stopColor="#3D6DFF" />
                    <stop offset="1" stopColor="#4DC5CA" />
                </linearGradient>
            </defs>
        </svg>
    );
};

const RaydiumAMMBuyIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <Image src={RaydiumAMMBuy} alt="Raydium AMM Buy" className={className} />
    );
};

const RaydiumAMMSellIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <Image src={RaydiumAMMSell} alt="Raydium AMM Sell" className={className} />
    );
};

const RaydiumCPMMBuyIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <Image src={RaydiumCPMMBuy} alt="Raydium CPMM Buy" className={className} />
    );
};

const RaydiumCPMMSellIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <Image src={RaydiumCPMMSell} alt="Raydium CPMM Sell" className={className} />
    );
};

const OpenBookIcon = ({ className = '' }: RaydiumIconProps) => {
    return (
        <Image src={OpenBook} alt="OpenBook" className={className} />
    );
};


export { RaydiumIcon, RaydiumAMMBuyIcon, RaydiumAMMSellIcon, RaydiumCPMMBuyIcon, RaydiumCPMMSellIcon, OpenBookIcon };