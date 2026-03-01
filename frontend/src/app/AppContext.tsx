/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"; 

import React, { createContext, useContext, useState } from "react";

interface AppContextProps {
    voiceSearchText: string; // Replace 'string' with the type of your state
    setVoiceSearchText: React.Dispatch<React.SetStateAction<string>>;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceSearchText, setVoiceSearchText] = useState<string>(""); // Initialize your shared state

  return (
    <AppContext.Provider value={{ voiceSearchText, setVoiceSearchText }}>
      {children}
    </AppContext.Provider>
  );
};

interface PathContextProps {
    viewName: string; // Replace 'string' with the type of your state
    setViewName: React.Dispatch<React.SetStateAction<string>>;
    filesContext: any[];
    setFilesContext: React.Dispatch<React.SetStateAction<any[]>>;
}

export const PathContext = createContext<PathContextProps | undefined>(undefined);

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewName, setViewName] = useState<string>(""); // Initialize your shared state
  const [ filesContext, setFilesContext ] = useState<any[]>([]);

  return (
    <PathContext.Provider value={{ viewName, setViewName, filesContext, setFilesContext }}>
      {children}
    </PathContext.Provider>
  );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
      throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
  };

  export const usePathContext = () => {
    const context = useContext(PathContext);
    if (!context) {
      throw new Error("usePPathContext must be used within an PathProvider");
    }
    return context;
  };

