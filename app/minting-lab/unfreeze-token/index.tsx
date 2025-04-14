import { getHeaderLayout } from "@/components/header-layout";
import UnfreezeToken from "./UnfreezeToken";
import { ReactNode } from "react";
import React from 'react';

export const UnfreezeTokenPage = () => {
    return (
        <div className="flex justify-center items-center">
            <div className="space-y-4 mt-10 mb-8 w-2/3">
                <div className="md:grid md:gap-6">
                    <div className="">
                        <UnfreezeToken />
                    </div>
                </div>
            </div>
        </div>
    );
};

UnfreezeTokenPage.getLayout = (page: ReactNode) => getHeaderLayout(page, "Unfreeze Token Accounts");

export default UnfreezeTokenPage; 