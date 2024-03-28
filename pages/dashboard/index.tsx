import React from 'react'
import { getHeaderLayout } from "../../components/layouts/HeaderLayout"
import { ReactNode } from 'react';

const SubDashboard = () => {
    return (
        <div className=' flex w-full justify-center items-center   h-full min-h-screen'> <p className="text-[42px] lg:text-[126px]  leading-[126px] text-center font-[HeliukBrave]  uppercase ">Coming<span className="text-[#f5ac41] mx-4 relative">Soon

        </span></p></div>
    )
}
SubDashboard.getLayout = (page: ReactNode) => getHeaderLayout(page, "Liquidity Manager");

export default SubDashboard