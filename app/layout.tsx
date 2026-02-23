import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

export const metadata: Metadata = {
  title: 'Research Forge — 人文・社会学研究者のためのAIツール生成',
  description:
    '対話だけで研究ツールを作成。プログラミング不要。人文・社会学の専門知識を理解したAIが、あなたの研究に最適なツールを生成します。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="grain-overlay">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
