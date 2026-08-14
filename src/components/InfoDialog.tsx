import { useAppStore } from '../stores/appStore';
import { formatDateTime } from '../utils/date';
import { Icon } from './Icon';

export function InfoDialog() {
  const open = useAppStore((state) => state.infoOpen);
  const setOpen = useAppStore((state) => state.setInfoOpen);
  const manifest = useAppStore((state) => state.manifest);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">ABOUT THIS DATA</p><h2 id="info-title">このデータについて</h2></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="閉じる"><Icon name="close" /></button></header>
        <div className="dialog-body">
          <p>{manifest?.quantity === 'precipitation_intensity' ? '250mレーダーレイヤは、気象業務支援センターが公開する気象庁高解像度降水ナウキャストの実配信サンプルです。' : '解析雨量は、気象レーダーと地上雨量計による観測を組み合わせて解析された面的な降水量データです。'}</p>
          <div className="important-callout"><strong>値の意味</strong><p>{manifest?.semantics}</p></div>
          {manifest && <dl><div><dt>データセット</dt><dd>{manifest.dataset}</dd></div><div><dt>解像度 / 間隔</dt><dd>{manifest.resolution} / {manifest.intervalMinutes}分</dd></div><div><dt>データ期間</dt><dd>{formatDateTime(manifest.availableFrom)}〜{formatDateTime(manifest.availableTo)}</dd></div><div><dt>データソース</dt><dd>{manifest.source}</dd></div><div><dt>処理バージョン</dt><dd>{manifest.processorVersion}</dd></div><div><dt>時刻</dt><dd>日本標準時 JST</dd></div></dl>}
          <h3>利用上の注意</h3><p>研究・防災分析用の過去データビューアです。リアルタイムの生命・安全判断を本サイトだけに依存しないでください。</p>
          <h3>ライセンス</h3><p>ソースコードはMITライセンスです。気象データの利用・再配布条件はソースコードのライセンスとは別に確認が必要です。</p>
        </div>
      </section>
    </div>
  );
}
