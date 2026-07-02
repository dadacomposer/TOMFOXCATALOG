import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Track = any;

type DownloadContextType = {
  downloadTrack: Track | null;
  buttonRect: DOMRect | null;
  openDownloadModal: (track: Track, event?: React.MouseEvent) => void;
  closeDownloadModal: () => void;
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadTrack, setDownloadTrack] = useState<Track | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const { user, setLoginModalOpen } = useAuth();

  const openDownloadModal = (track: Track, event?: React.MouseEvent) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (event) {
      setButtonRect(event.currentTarget.getBoundingClientRect());
    } else {
      setButtonRect(null);
    }
    setDownloadTrack(track);
  };

  const closeDownloadModal = () => {
    setDownloadTrack(null);
    setButtonRect(null);
  };

  return (
    <DownloadContext.Provider value={{ downloadTrack, buttonRect, openDownloadModal, closeDownloadModal }}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
}
