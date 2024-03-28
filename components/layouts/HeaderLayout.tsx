import Head from "next/head";
import { FC, ReactNode } from "react";
import Header from "../common/Header";
import React from 'react';
import Sidebar from "../common/Sidebar";
import { useRouter } from "next/router";

type HeaderLayoutProps = {
  title?: string;
  children: ReactNode;
};

export const HeaderLayout: FC<HeaderLayoutProps> = ({ title, children }) => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>{title ? `${title} - Mevarik` : `Mevarik`}</title>
      </Head>
      <div className="w-full h-screen overflow-y-auto flex flex-col space-y-4 justify-between  ">
        <div className="w-full mx-auto">
          <Header />
          <div className="flex  justify-start items-start h-full w-full">
            {router.pathname != "/" &&

              <div className=" hidden md:flex min-w-[250px] h-full  bg-[#0d1117] border-gray-700">
                <Sidebar />
              </div>
            }
            <div className="px-4 py-10 mx-auto space-y-6 w-full h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getHeaderLayout = (page: React.ReactNode, title?: string) => (
  <HeaderLayout title={title}>{page}</HeaderLayout>
);