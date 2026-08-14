import { useCallback, useState } from 'react';

import { APP_NAME } from '../config/app';

export function useShare() {
  const [message, setMessage] = useState<string | null>(null);
  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, url: window.location.href });
        setMessage('共有しました');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage('URLをコピーしました');
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setMessage('共有できませんでした');
      }
    }
    window.setTimeout(() => setMessage(null), 2200);
  }, []);
  return { share, message };
}

