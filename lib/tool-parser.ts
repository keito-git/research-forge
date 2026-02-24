import type { GeneratedTool, StreamingToolProgress } from '@/types';

// LRU-1 caches: store last input→result to avoid re-parsing identical content
let _parseCache: { input: string; result: GeneratedTool | null } | null = null;
let _progressCache: { input: string; length: number; result: StreamingToolProgress } | null = null;

export function tryParseToolGeneration(text: string): GeneratedTool | null {
  // LRU-1: return cached result if input is identical
  if (_parseCache && _parseCache.input === text) {
    return _parseCache.result;
  }

  const result = _tryParseToolGenerationImpl(text);
  _parseCache = { input: text, result };
  return result;
}

function _tryParseToolGenerationImpl(text: string): GeneratedTool | null {
  // Strategy 1: Try ```json block
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed?.type === 'tool_generation' && parsed?.tool?.html) {
        return parsed.tool;
      }
    }
  } catch {}

  // Strategy 2: Look for "tool_generation" and extract the html field directly
  try {
    if (text.includes('"tool_generation"') && text.includes('"html"')) {
      const htmlStartMarker = '"html"';
      const htmlIdx = text.indexOf(htmlStartMarker);
      if (htmlIdx === -1) return null;

      let i = htmlIdx + htmlStartMarker.length;
      while (i < text.length && text[i] !== '"') i++;
      if (i >= text.length) return null;

      i++;
      let htmlContent = '';
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          const next = text[i + 1];
          if (next === '"') {
            htmlContent += '"';
            i += 2;
          } else if (next === 'n') {
            htmlContent += '\n';
            i += 2;
          } else if (next === 't') {
            htmlContent += '\t';
            i += 2;
          } else if (next === '\\') {
            htmlContent += '\\';
            i += 2;
          } else if (next === '/') {
            htmlContent += '/';
            i += 2;
          } else {
            htmlContent += text[i];
            i++;
          }
        } else if (text[i] === '"') {
          break;
        } else {
          htmlContent += text[i];
          i++;
        }
      }

      if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html') || htmlContent.includes('<head')) {
        const titleMatch = text.match(/"title"\s*:\s*"([^"]*?)"/);
        const descMatch = text.match(/"description"\s*:\s*"([^"]*?)"/);
        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*?)"/);
        const mechanismMatch = text.match(/"mechanism"\s*:\s*"([^"]*?)"/);
        const usageHintMatch = text.match(/"usage_hint"\s*:\s*"([^"]*?)"/);

        const adviceMatches: string[] = [];
        const adviceRegex = /"academic_advice"\s*:\s*\[([\s\S]*?)\]/;
        const adviceArrayMatch = text.match(adviceRegex);
        if (adviceArrayMatch) {
          const items = adviceArrayMatch[1].match(/"([^"]*?)"/g);
          items?.forEach((item) => adviceMatches.push(item.replace(/^"|"$/g, '')));
        }

        return {
          title: titleMatch?.[1] ?? 'ツール',
          description: descMatch?.[1] ?? '',
          html: htmlContent,
          explanation: {
            summary: summaryMatch?.[1] ?? '',
            mechanism: mechanismMatch?.[1] ?? '',
            usage_hint: usageHintMatch?.[1] ?? '',
          },
          customizable_params: [],
          academic_advice: adviceMatches,
        };
      }
    }
  } catch (e) {
    console.warn('Research Forge: Tool parse strategy 2 failed:', e);
  }

  // Strategy 3: Try the whole text as JSON
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type === 'tool_generation' && parsed?.tool?.html) {
        return parsed.tool;
      }
    }
  } catch {}

  return null;
}

export function parseStreamingToolProgress(content: string): StreamingToolProgress {
  // LRU-1: return cached result if input is identical
  if (_progressCache && _progressCache.input === content) {
    return _progressCache.result;
  }

  // Fast path for html stage: if only contentLength changed by < 200 chars, reuse previous parse
  if (_progressCache && content.startsWith(_progressCache.input.slice(0, 100))) {
    const lengthDelta = content.length - _progressCache.length;
    if (lengthDelta > 0 && lengthDelta < 200 && _progressCache.result.stage === 'html') {
      const result = { ..._progressCache.result, contentLength: content.length };
      _progressCache = { input: content, length: content.length, result };
      return result;
    }
  }

  const titleMatch = content.match(/"title"\s*:\s*"([^"]*?)"/);
  const descMatch = content.match(/"description"\s*:\s*"([^"]*?)"/);

  let stage: StreamingToolProgress['stage'] = 'starting';
  if (content.includes('"academic_advice"')) {
    stage = 'finishing';
  } else if (content.includes('"explanation"')) {
    stage = 'explanation';
  } else if (content.includes('"html"')) {
    stage = 'html';
  }

  const result: StreamingToolProgress = {
    title: titleMatch?.[1],
    description: descMatch?.[1],
    stage,
    contentLength: content.length,
  };
  _progressCache = { input: content, length: content.length, result };
  return result;
}
