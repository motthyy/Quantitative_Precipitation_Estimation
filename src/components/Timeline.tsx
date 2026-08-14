import { PLAYBACK_SPEEDS } from '../config/app';
import { useAppStore } from '../stores/appStore';
import { formatDate, formatDateTime, formatTime, toDateTimeLocal } from '../utils/date';
import { Icon } from './Icon';

function nearestFrameIndex(frames: { timestamp: string }[], value: string): number {
  const target = new Date(value).getTime();
  return frames.reduce(
    (best, frame, index) => {
      const distance = Math.abs(new Date(frame.timestamp).getTime() - target);
      return distance < best.distance ? { index, distance } : best;
    },
    { index: 0, distance: Number.POSITIVE_INFINITY },
  ).index;
}

export function Timeline() {
  const manifest = useAppStore((state) => state.manifest);
  const currentIndex = useAppStore((state) => state.currentIndex);
  const setCurrentIndex = useAppStore((state) => state.setCurrentIndex);
  const moveFrame = useAppStore((state) => state.moveFrame);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const togglePlaying = useAppStore((state) => state.togglePlaying);
  const playbackSpeed = useAppStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useAppStore((state) => state.setPlaybackSpeed);
  const skipMinutes = useAppStore((state) => state.skipMinutes);
  const setSkipMinutes = useAppStore((state) => state.setSkipMinutes);
  const rangeStartIndex = useAppStore((state) => state.rangeStartIndex);
  const rangeEndIndex = useAppStore((state) => state.rangeEndIndex);
  const setPlaybackRange = useAppStore((state) => state.setPlaybackRange);
  if (!manifest) return null;

  const frame = manifest.frames[currentIndex];
  const skipOptions = manifest.intervalMinutes === 5
    ? [5, 15, 30, 60, 120]
    : [30, 60, 120, 180, 360];
  return (
    <section className="timeline-shell" aria-label="時間操作" data-testid="timeline">
      <div className="timeline-now">
        <div><span>表示時刻</span><strong>{formatTime(frame.timestamp)}</strong><small>{formatDate(frame.timestamp)} JST</small></div>
        <label className="datetime-jump">
          <span>日時指定</span>
          <input
            type="datetime-local"
            min={toDateTimeLocal(manifest.availableFrom)}
            max={toDateTimeLocal(manifest.availableTo)}
            value={toDateTimeLocal(frame.timestamp)}
            onChange={(event) => setCurrentIndex(nearestFrameIndex(manifest.frames, event.target.value))}
          />
        </label>
      </div>
      <div className="timeline-main">
        <div className="slider-row">
          <span>{formatDateTime(manifest.frames[0].timestamp)}</span>
          <input
            data-testid="time-slider"
            aria-label="表示時刻"
            type="range"
            min="0"
            max={manifest.frames.length - 1}
            value={currentIndex}
            onChange={(event) => setCurrentIndex(Number(event.target.value))}
          />
          <span>{formatDateTime(manifest.frames.at(-1)!.timestamp)}</span>
        </div>
        <div className="playback-row">
          <button type="button" className="transport-button" onClick={() => moveFrame(-1)} disabled={currentIndex === 0} aria-label="前のフレーム">
            <Icon name="previous" /><span>前へ</span>
          </button>
          <button type="button" className="play-button" onClick={togglePlaying} data-testid="playback-toggle">
            <Icon name={isPlaying ? 'pause' : 'play'} />{isPlaying ? '一時停止' : '再生'}
          </button>
          <button type="button" className="transport-button" onClick={() => moveFrame(1)} disabled={currentIndex === manifest.frames.length - 1} aria-label="次のフレーム">
            <span>次へ</span><Icon name="next" />
          </button>
          <label className="compact-select"><span>速度</span><select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value) as 0.5 | 1 | 2 | 4)}>{PLAYBACK_SPEEDS.map((speed) => <option key={speed} value={speed}>×{speed}</option>)}</select></label>
          <label className="compact-select"><span>送り</span><select value={skipMinutes} onChange={(event) => setSkipMinutes(Number(event.target.value))}>{skipOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes}分` : `${minutes / 60}時間`}</option>)}</select></label>
        </div>
      </div>
      <details className="playback-range">
        <summary>再生する期間を指定</summary>
        <div>
          <label>開始<input type="datetime-local" value={toDateTimeLocal(manifest.frames[rangeStartIndex].timestamp)} min={toDateTimeLocal(manifest.availableFrom)} max={toDateTimeLocal(manifest.frames[rangeEndIndex].timestamp)} onChange={(event) => setPlaybackRange(nearestFrameIndex(manifest.frames, event.target.value), rangeEndIndex)} /></label>
          <span>〜</span>
          <label>終了<input type="datetime-local" value={toDateTimeLocal(manifest.frames[rangeEndIndex].timestamp)} min={toDateTimeLocal(manifest.frames[rangeStartIndex].timestamp)} max={toDateTimeLocal(manifest.availableTo)} onChange={(event) => setPlaybackRange(rangeStartIndex, nearestFrameIndex(manifest.frames, event.target.value))} /></label>
        </div>
      </details>
    </section>
  );
}
