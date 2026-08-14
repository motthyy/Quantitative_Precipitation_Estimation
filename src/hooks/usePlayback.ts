import { useEffect } from 'react';

import { useAppStore } from '../stores/appStore';

export function usePlayback() {
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playbackSpeed = useAppStore((state) => state.playbackSpeed);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const rangeStartIndex = useAppStore((state) => state.rangeStartIndex);
  const rangeEndIndex = useAppStore((state) => state.rangeEndIndex);
  const setCurrentIndex = useAppStore((state) => state.setCurrentIndex);
  const setPlaying = useAppStore((state) => state.setPlaying);

  useEffect(() => {
    if (!isPlaying) return;
    const timeout = window.setTimeout(() => {
      setCurrentIndex(currentIndex >= rangeEndIndex ? rangeStartIndex : currentIndex + 1);
    }, 1000 / playbackSpeed);
    return () => window.clearTimeout(timeout);
  }, [currentIndex, isPlaying, playbackSpeed, rangeEndIndex, rangeStartIndex, setCurrentIndex]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [setPlaying]);
}

