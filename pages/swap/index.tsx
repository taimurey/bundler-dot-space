import React from "react";
import { getSearchLayout } from "../../components/layouts/SearchLayout";
import { ReactNode } from "react";

const Swap = () => {
    return (
        <div className="flex flex-col   relative w-full mx-auto">
            <div className="text-center">
                <p>SWAP</p>
            </div>
        </div >
    );
};


Swap.getLayout = (page: ReactNode) => getSearchLayout(page, "Swap");

export default Swap;