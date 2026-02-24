export function EmptyPreview() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-xs">
        <div className="w-10 h-10 rounded-lg bg-sand-100 flex items-center justify-center mx-auto mb-5">
          <span className="text-lg">{'\uD83C\uDF31'}</span>
        </div>
        <p className="text-sm text-ink-400 leading-relaxed">
          チャットで研究の課題を教えてください。
          <br />
          最適なツールを作ります。
        </p>
      </div>
    </div>
  );
}
