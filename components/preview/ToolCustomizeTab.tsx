'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { CustomizableParam } from '@/types';

export function ToolCustomizeTab({
  params,
  customParams,
  onParamChange,
}: {
  params: CustomizableParam[];
  customParams: Record<string, string>;
  onParamChange: (id: string, value: string) => void;
}) {
  return (
    <div className="p-6 space-y-4">
      <h3 className="font-medium text-ink-800">カスタマイズ</h3>
      {params.length > 0 ? (
        params.map((param) => (
          <Card key={param.id} className="p-4">
            <label className="block text-sm font-medium text-ink-700 mb-2">{param.label}</label>
            {param.type === 'slider' && (
              <Slider
                min={Number(param.min) || 0}
                max={Number(param.max) || 100}
                step={1}
                value={[Number(customParams[param.id] ?? param.default)]}
                onValueChange={([v]) => onParamChange(param.id, String(v))}
              />
            )}
            {param.type === 'color' && (
              <input
                type="color"
                value={customParams[param.id] ?? param.default}
                onChange={(e) => onParamChange(param.id, e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            )}
            {param.type === 'toggle' && (
              <Switch
                checked={customParams[param.id] === 'true'}
                onCheckedChange={(checked) => onParamChange(param.id, String(checked))}
              />
            )}
            {param.type === 'select' && (
              <Select value={customParams[param.id] ?? param.default} onValueChange={(v) => onParamChange(param.id, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {param.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {param.type === 'text' && (
              <Input
                value={customParams[param.id] ?? param.default}
                onChange={(e) => onParamChange(param.id, e.target.value)}
              />
            )}
          </Card>
        ))
      ) : (
        <p className="text-sm text-ink-400">このツールにはカスタマイズ可能なパラメータがありません。</p>
      )}
    </div>
  );
}
