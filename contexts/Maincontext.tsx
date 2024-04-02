// contexts/MyContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define types for context values
interface MyContextProps {
    isProfilesActive: boolean;
    setisProfilesActive: (value: boolean) => void;
}

// Create the context
const MyContext = createContext<MyContextProps | undefined>(undefined);



// Create a provider component
export const MyContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isProfilesActive, setisProfilesActive] = useState(false);

    return (
        <MyContext.Provider value={{ isProfilesActive, setisProfilesActive }}>
            {children}
        </MyContext.Provider>
    );
};

// Custom hook for using MyContext
export const useMyContext = () => {
    const context = useContext(MyContext);
    if (!context) {
        throw new Error('useMyContext must be used within a MyContextProvider');
    }
    return context;
};
