import { APP_NAME } from '../config/app';
import { useShare } from '../hooks/useShare';
import { useAppStore } from '../stores/appStore';
import { formatDateTime } from '../utils/date';
import { Icon } from './Icon';

export function AppHeader() {
  const manifest = useAppStore((state) => state.manifest);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const setInfoOpen = useAppStore((state) => state.setInfoOpen);
  const setPanelOpen = useAppStore((state) => state.setPanelOpen);
  const { share, message } = useShare();
  const frame = manifest?.frames[currentIndex];

  return (
    <header className="app-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">JMA RAINFALL ARCHIVE</p>
          <h1>{APP_NAME}</h1>
        </div>
      </div>
      {frame && (
        <div className="archive-clock" aria-label={`表示日時 ${formatDateTime(frame.timestamp)}`}>
          <span>過去データ</span>
          <strong>{formatDateTime(frame.timestamp)}</strong>
          <small>JST</small>
        </div>
      )}
      <div className="header-actions">
        <select
          className="theme-select"
          value={theme}
          onChange={(event) => setTheme(event.target.value as 'system' | 'light' | 'dark')}
          aria-label="表示テーマ"
        >
          <option value="system">端末設定</option>
          <option value="light">ライト</option>
          <option value="dark">ダーク</option>
        </select>
        <button className="icon-button" type="button" onClick={() => void share()} aria-label="現在の地図を共有">
          <Icon name="share" />
          <span className="desktop-label">共有</span>
        </button>
        <button className="icon-button" type="button" onClick={() => setInfoOpen(true)} aria-label="このデータについて">
          <Icon name="info" />
        </button>
        <button className="icon-button mobile-only" type="button" onClick={() => setPanelOpen(true)} aria-label="地点分析を開く">
          <Icon name="layers" />
        </button>
      </div>
      {message && <div className="toast" role="status">{message}</div>}
    </header>
  );
}

