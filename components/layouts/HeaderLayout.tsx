import Head from "next/head";
import { FC, ReactNode } from "react";
import Header from "../common/Header";
import React from 'react';

type HeaderLayoutProps = {
  title?: string;
  children: ReactNode;
};

export const HeaderLayout: FC<HeaderLayoutProps> = ({ title, children }) => {
  return (
    <>
      <Head>
        <title>{title ? `${title} - Mevarik` : `Mevarik`}</title>
      </Head>
      <div className="w-full h-screen overflow-y-auto flex flex-col space-y-4 justify-between">
        <div className="w-full mx-auto">
          <Header />
          <div className="px-4 py-10 mx-auto space-y-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export const getHeaderLayout = (page: React.ReactNode, title?: string) => (
  <HeaderLayout title={title}>{page}</HeaderLayout>
);