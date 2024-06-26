import { FC, } from "react";
import React from 'react';
import AppHeader from "./AppHeader/AppHeader";

const Header: FC = () => {
  return (
    <div
      className="relative z-50">
      <AppHeader />
    </div>
  );
};

export default Header;