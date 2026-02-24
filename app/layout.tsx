import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Research Forge — 人文・社会学研究者のためのAIツール生成',
  description:
    '対話だけで研究ツールを作成。プログラミング不要。人文・社会学の専門知識を理解したAIが、あなたの研究に最適なツールを生成します。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ErrorBoundary>
          <TooltipProvider>{children}</TooltipProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
