import React from 'react';

const SolanaIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 30 30"
            fill="none"
            className={`${className}`}
        >
            <rect width="30" height="30" rx="15" fill="black" />
            <path
                d="M7.87956 19.2992C8.00685 19.1719 8.18188 19.0977 8.36752 19.0977H25.2022C25.5098 19.0977 25.6637 19.4689 25.4462 19.6864L22.1206 23.012C21.9933 23.1393 21.8183 23.2135 21.6327 23.2135H4.79797C4.49035 23.2135 4.33653 22.8422 4.55399 22.6248L7.87956 19.2992Z"
                fill="url(#paint0_linear_8442_25534)"
            />
            <path
                d="M7.87956 6.88124C8.01216 6.75394 8.18719 6.67969 8.36752 6.67969H25.2022C25.5098 6.67969 25.6637 7.05096 25.4462 7.26842L22.1206 10.594C21.9933 10.7213 21.8183 10.7955 21.6327 10.7955H4.79797C4.49035 10.7955 4.33653 10.4243 4.55399 10.2068L7.87956 6.88124Z"
                fill="url(#paint1_linear_8442_25534)"
            />
            <path
                d="M22.1206 13.0492C21.9933 12.9219 21.8183 12.8477 21.6327 12.8477H4.79797C4.49035 12.8477 4.33653 13.2189 4.55399 13.4364L7.87956 16.762C8.00685 16.8893 8.18188 16.9635 8.36752 16.9635H25.2022C25.5098 16.9635 25.6637 16.5922 25.4462 16.3748L22.1206 13.0492Z"
                fill="url(#paint2_linear_8442_25534)"
            />
            <defs>
                <linearGradient
                    id="paint0_linear_8442_25534"
                    x1="23.594"
                    y1="4.69455"
                    x2="11.9431"
                    y2="27.0108"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#00FFA3" />
                    <stop offset="1" stopColor="#DC1FFF" />
                </linearGradient>
                <linearGradient
                    id="paint1_linear_8442_25534"
                    x1="18.4996"
                    y1="2.03337"
                    x2="6.84865"
                    y2="24.3496"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#00FFA3" />
                    <stop offset="1" stopColor="#DC1FFF" />
                </linearGradient>
                <linearGradient
                    id="paint2_linear_8442_25534"
                    x1="21.0306"
                    y1="3.35426"
                    x2="9.37964"
                    y2="25.6705"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#00FFA3" />
                    <stop offset="1" stopColor="#DC1FFF" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default SolanaIcon;