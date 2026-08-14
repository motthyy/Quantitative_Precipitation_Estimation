import { useEffect } from 'react';

import { useAppStore } from '../stores/appStore';

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

export function useKeyboardShortcuts() {
  const togglePlaying = useAppStore((state) => state.togglePlaying);
  const moveFrame = useAppStore((state) => state.moveFrame);
  const setSelectedPoint = useAppStore((state) => state.setSelectedPoint);
  const setPanelOpen = useAppStore((state) => state.setPanelOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlaying();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFrame(-1, event.shiftKey ? 60 : 30);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveFrame(1, event.shiftKey ? 60 : 30);
      } else if (event.key === 'Escape') {
        setSelectedPoint(null);
        setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveFrame, setPanelOpen, setSelectedPoint, togglePlaying]);
}

