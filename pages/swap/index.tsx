import React, { useEffect, useState } from "react";
import { getSearchLayout } from "../../components/layouts/SearchLayout";
import { ReactNode } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, } from '@fortawesome/free-brands-svg-icons';






const Swap = () => {
    const [isVisible, setIsVisible] = useState(false);
    // const [activepage, setActivePage] = useState("About");





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