import React, { createContext, useContext, useState, ReactNode } from 'react';

// Using 'any' for Track to avoid strict typing issues, or import if available
interface LicenseContextType {
  licenseTrack: any | null;
  openLicenseModal: (track: any) => void;
  closeLicenseModal: () => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [licenseTrack, setLicenseTrack] = useState<any | null>(null);

  const openLicenseModal = (track: any) => {
    setLicenseTrack(track);
  };

  const closeLicenseModal = () => {
    setLicenseTrack(null);
  };

  return (
    <LicenseContext.Provider
      value={{
        licenseTrack,
        openLicenseModal,
        closeLicenseModal,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
