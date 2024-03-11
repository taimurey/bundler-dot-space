import { FC, } from "react";
import React from 'react';
import AppHeader from "./AppHeader/AppHeader";
import Dashboard from "./Dashboard";

const Header: FC = () => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 150) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
    //  tw="bg-v3-bg h-screen w-screen max-w-[100vw] overflow-x-hidden flex flex-col justify-between"
    >
      <AppHeader />
      <Dashboard isExpanded={isExpanded} />
    </div>
  );
};

export default Header;
