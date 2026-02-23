export function ToolCodeTab({ html }: { html: string }) {
  return (
    <div className="p-4">
      <pre className="code-block bg-ink-950 text-green-300 p-4 rounded-xl overflow-x-auto">{html}</pre>
    </div>
  );
}
