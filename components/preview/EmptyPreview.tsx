export function EmptyPreview() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">{'\uD83C\uDF31'}</div>
        <h3 className="font-display text-lg font-bold text-ink-800 mb-2">ツールがここに表示されます</h3>
        <p className="text-sm text-ink-400 leading-relaxed mb-4">
          左のチャットでツールについてお話しください。AIがあなたの研究に最適なツールを作成します。
        </p>
        <p className="text-xs text-ink-300 bg-sand-100 rounded-xl px-4 py-3 leading-relaxed">
          完成したツールは「ツールを使う」ボタンで新しいタブに開けます。ファイル読み込みなど全機能が使えます。
        </p>
      </div>
    </div>
  );
}
