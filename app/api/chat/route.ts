import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { buildSystemPrompt, type UserProfile } from '@/lib/prompts';

export const maxDuration = 120;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '不正なリクエスト形式です。' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: '不正なリクエスト形式です。' }, { status: 400 });
  }

  const { messages, profile, apiKey, model } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'メッセージが空です。' }, { status: 400 });
  }

  if (typeof apiKey !== 'undefined' && typeof apiKey !== 'string') {
    return Response.json({ error: 'APIキーの形式が不正です。' }, { status: 400 });
  }

  if (typeof model !== 'undefined' && typeof model !== 'string') {
    return Response.json({ error: 'モデル指定の形式が不正です。' }, { status: 400 });
  }

  const key = (apiKey as string) || process.env.ANTHROPIC_API_KEY;
  const selectedModel = (model as string) || 'claude-sonnet-4-20250514';

  if (!key) {
    return Response.json(
      { error: 'APIキーが設定されていません。設定画面からAPIキーを入力してください。' },
      { status: 401 },
    );
  }

  const anthropic = createAnthropic({ apiKey: key });
  const userProfile: UserProfile = (profile as UserProfile) ?? { field: 'other' };
  const systemPrompt = buildSystemPrompt(userProfile, key);

  try {
    const result = streamText({
      model: anthropic(selectedModel),
      system: systemPrompt,
      messages,
      maxTokens: 16384,
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const msg = error instanceof Error ? error.message : '';
    const message =
      msg.includes('401') || msg.includes('authentication')
        ? 'APIキーが無効です。正しいキーを入力してください。'
        : msg.includes('429')
          ? 'リクエストが多すぎます。少し待ってから再度お試しください。'
          : 'エラーが発生しました。もう一度お試しください。';
    return Response.json({ error: message }, { status: 500 });
  }
}
