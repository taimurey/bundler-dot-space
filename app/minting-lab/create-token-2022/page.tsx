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
        <div className="w-full max-w-4xl mx-auto p-4 py-10">
            <div className="bg-[#0c0e11] bg-opacity-70 border border-neutral-500/40 rounded-sm shadow-md">
                <Token2022Component />
            </div>
        </div>
    );
};

export default CreateToken2022Page; 