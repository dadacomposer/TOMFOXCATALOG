import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type Track = any;

type OpenDownloadOptions = {
  forceUnrestricted?: boolean;
  sharedSlug?: string;
};

type DownloadContextType = {
  downloadTrack: Track | null;
  buttonRect: DOMRect | null;
  buttonElement: HTMLElement | null;
  forceUnrestricted: boolean;
  sharedSlug: string | null;
  openDownloadModal: (track: Track, event?: React.MouseEvent, options?: OpenDownloadOptions) => void;
  closeDownloadModal: () => void;
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadTrack, setDownloadTrack] = useState<Track | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null);
  const [forceUnrestricted, setForceUnrestricted] = useState(false);
  const [sharedSlug, setSharedSlug] = useState<string | null>(null);
  const { user, setLoginModalOpen } = useAuth();

  const openDownloadModal = (track: Track, event?: React.MouseEvent, options?: OpenDownloadOptions) => {
    const isUnrestricted = options?.forceUnrestricted ?? false;
    
    if (!user && !isUnrestricted) {
      setLoginModalOpen(true);
      return;
    }
    
    if (event) {
      setButtonElement(event.currentTarget as HTMLElement);
      setButtonRect(event.currentTarget.getBoundingClientRect());
    } else {
      setButtonElement(null);
      setButtonRect(null);
    }

    setForceUnrestricted(isUnrestricted);
    setSharedSlug(options?.sharedSlug || null);
    setDownloadTrack(track);
  };

  const closeDownloadModal = () => {
    setDownloadTrack(null);
    setButtonRect(null);
    setButtonElement(null);
    setForceUnrestricted(false);
    setSharedSlug(null);
  };

  return (
    <DownloadContext.Provider value={{ downloadTrack, buttonRect, buttonElement, forceUnrestricted, sharedSlug, openDownloadModal, closeDownloadModal }}>
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
