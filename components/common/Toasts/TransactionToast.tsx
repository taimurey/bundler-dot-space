"use client"
import React from 'react';

interface TransactionToastProps {
    txSig: string;
    message: string;
}

interface LinkToastProps {
    link: string;
    message: string;
}

export const TransactionToast: React.FC<TransactionToastProps> = ({ txSig, message }) => {
    return (
        <div className="flex flex-col w-full">
            <div className="text-white font-semibold mb-1">{message}</div>
            <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm truncate max-w-[120px]">{txSig}</span>
                <a
                    href={`https://solscan.io/tx/${txSig}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                >
                    View Transaction
                </a>
            </div>
        </div>
    );
};

export const LinkToast: React.FC<LinkToastProps> = ({ link, message }) => {
    return (
        <div className="flex flex-col w-full">
            <div className="text-white font-semibold mb-1">{message}</div>
            <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm truncate max-w-[120px]">{link}</span>
                <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                >
                    View Link
                </a>
            </div>
        </div>
    );
}; 