"use client"
import { FC } from "react";
import BurnToken from "./BurnToken";

const BurnTokenPage: FC = () => {
    return (
        <div className="w-full max-w-4xl mx-auto px-4">
            <div className="bg-[#0c0e11] bg-opacity-70 border border-neutral-500 rounded-lg shadow-md">
                <BurnToken />
            </div>
        </div>
    );
};

export default BurnTokenPage; 