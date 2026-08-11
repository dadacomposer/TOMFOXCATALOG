import React, { createContext, useContext, useState, ReactNode } from 'react';

type SearchBarContextType = {
  rightContent: ReactNode | null;
  setRightContent: (content: ReactNode | null) => void;
  bottomContent: ReactNode | null;
  setBottomContent: (content: ReactNode | null) => void;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
};

const SearchBarContext = createContext<SearchBarContextType>({
  rightContent: null,
  setRightContent: () => {},
  bottomContent: null,
  setBottomContent: () => {},
  isAnimating: false,
  setIsAnimating: () => {},
});

export const SearchBarProvider = ({ children }: { children: ReactNode }) => {
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);
  const [bottomContent, setBottomContent] = useState<ReactNode | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <SearchBarContext.Provider 
      value={{ 
        rightContent, setRightContent, 
        bottomContent, setBottomContent,
        isAnimating, setIsAnimating
      }}
    >
      {children}
    </SearchBarContext.Provider>
  );
};

export const useSearchBar = () => useContext(SearchBarContext);
