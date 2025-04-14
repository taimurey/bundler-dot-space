import { getHeaderLayout } from "@/components/header-layout";
import FreezeToken from "./FreezeToken";
import { ReactNode } from "react";
import React from 'react';

export const FreezeTokenPage = () => {
    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <div className="md:grid md:gap-6">
                    <div className="">
                        <FreezeToken />
                    </div>
                </div>
            </div>
        </div>
    );
};

FreezeTokenPage.getLayout = (page: ReactNode) => getHeaderLayout(page, "Freeze Token Accounts");

export default FreezeTokenPage; 