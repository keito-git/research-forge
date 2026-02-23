import { Card } from '@/components/ui/card';
import type { GeneratedTool } from '@/types';

export function ToolAboutTab({ tool }: { tool: GeneratedTool }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="font-display text-xl font-bold text-ink-900 mb-1">{tool.title}</h3>
        <p className="text-ink-500 text-sm">{tool.description}</p>
      </div>
      <div className="space-y-4">
        {[
          { label: '概要', content: tool.explanation.summary, icon: '\uD83D\uDCCB' },
          { label: '仕組み', content: tool.explanation.mechanism, icon: '\u2699\uFE0F' },
          { label: '活用ヒント', content: tool.explanation.usage_hint, icon: '\uD83D\uDCA1' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="font-medium text-ink-800 text-sm">{s.label}</span>
            </div>
            <p className="text-ink-600 text-sm leading-relaxed">{s.content}</p>
          </Card>
        ))}
      </div>
      {tool.academic_advice?.length > 0 && (
        <div className="bg-forge-50 rounded-xl p-4 border border-forge-200">
          <h4 className="font-medium text-forge-800 text-sm mb-3">学術的アドバイス</h4>
          <div className="space-y-2">
            {tool.academic_advice.map((a, i) => (
              <p key={i} className="text-sm text-forge-700 leading-relaxed">
                {a}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
