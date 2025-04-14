"use client"
import React, { FC } from "react";
import dynamic from "next/dynamic";

// Dynamically import the Token2022 component
const Token2022Component = dynamic(
    () => import("./token-2022/CreateToken"),
    { ssr: false }
);

// Main component for the Token-2022 creation page
const CreateToken2022Page: FC = () => {
    return (
        <div className="relative w-full container mx-auto md:p-20 space-y-4">
            <div className="bg-[#0c0e11] bg-opacity-70 border border-neutral-500 p-4 rounded-2xl shadow-2xl shadow-black">
                <div className="pb-4">
                    <h1 className="text-2xl md:text-xl font-bold text-white mb-2">SPL Token-2022</h1>
                    <p className="text-[#8c929d]">
                        Create powerful tokens using Solana's Token Extensions with advanced features like transfer fees, memo requirements, and more.
                    </p>
                </div>

                <Token2022Component />
            </div>
        </div>
    );
};

export default CreateToken2022Page; 