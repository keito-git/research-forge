import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { buildSystemPrompt, type UserProfile } from '@/lib/prompts';

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, profile, apiKey, model } = await req.json();

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  const selectedModel = model || 'claude-sonnet-4-20250514';

  if (!key) {
    return Response.json(
      { error: 'APIキーが設定されていません。設定画面からAPIキーを入力してください。' },
      { status: 401 }
    );
  }

  const anthropic = createAnthropic({ apiKey: key });
  const userProfile: UserProfile = profile ?? { field: 'other' };
  const systemPrompt = buildSystemPrompt(userProfile, key);

  try {
    const result = await generateText({
      model: anthropic(selectedModel),
      system: systemPrompt,
      messages,
      maxTokens: 16384,
    });

    return Response.json({ content: result.text });
  } catch (error: any) {
    console.error('Chat API error:', error);
    const message = error?.message?.includes('401') || error?.message?.includes('authentication')
      ? 'APIキーが無効です。正しいキーを入力してください。'
      : error?.message?.includes('429')
      ? 'リクエストが多すぎます。少し待ってから再度お試しください。'
      : 'エラーが発生しました。もう一度お試しください。';
    return Response.json({ error: message }, { status: 500 });
  }
}
