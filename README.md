# Research Forge 🔨

**人文・社会学研究者のための AI駆動型ツール生成プラットフォーム**

対話だけで研究ツールを作成。プログラミング不要。  
人文・社会学の専門知識を理解したAIが、あなたの研究に最適なツールを生成します。

---

## ✨ 主な機能

- **対話型ツール生成**: 日本語で「こういうツールが欲しい」と話すだけでツールが完成
- **専門分野パーソナライズ**: 文学・社会学・歴史学など、あなたの分野に特化した対話
- **学術的アドバイス**: AIが研究手法の観点からツール活用法を提案
- **ビジュアルカスタマイズ**: スライダー・カラーピッカー等でコードなしで調整
- **3層説明**: ツールが「何をしているか」を平易な言葉で解説
- **ダウンロード・共有**: 作ったツールをHTMLファイルとして保存、別タブで利用

---

## 🚀 セットアップ手順

### 1. 必要なもの

- **Node.js** v18以上
- **Anthropic APIキー** ([https://console.anthropic.com/](https://console.anthropic.com/) で取得)

### 2. インストール

```bash
# リポジトリをクローン（またはzipを展開）
cd research-forge

# 依存パッケージをインストール
npm install

# 環境変数を設定
cp .env.example .env.local
```

### 3. APIキーの設定

`.env.local` ファイルを開き、Anthropic APIキーを設定します：

```
ANTHROPIC_API_KEY=sk-ant-あなたのAPIキー
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

---

## 🌐 Webに公開する（Vercelデプロイ）

### 方法1: Vercel CLI

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

### 方法2: GitHub連携（推奨）

1. このプロジェクトをGitHubにプッシュ
2. [vercel.com](https://vercel.com) にアクセスしてGitHubアカウントでログイン
3. 「New Project」→ リポジトリを選択
4. 環境変数に `ANTHROPIC_API_KEY` を設定
5. 「Deploy」をクリック

**これだけで、誰でもアクセスできるURLが発行されます！**

---

## 📁 プロジェクト構造

```
research-forge/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Claude APIとの通信
│   ├── globals.css              # グローバルスタイル
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                 # メインページ（オンボーディング/チャット切り替え）
├── components/
│   ├── Onboarding.tsx           # 専門分野入力画面
│   └── ChatInterface.tsx        # チャット + プレビュー画面
├── lib/
│   └── prompts.ts               # システムプロンプト・分野知識
├── public/                      # 静的ファイル
├── .env.example                 # 環境変数テンプレート
├── next.config.js               # Next.js設定
├── tailwind.config.js           # Tailwind CSS設定
├── tsconfig.json                # TypeScript設定
├── package.json                 # 依存関係
└── README.md                    # このファイル
```

---

## 🎯 使い方

### 1. 専門分野を入力
初回アクセス時に専門分野（文学、社会学、歴史学など）を選択します。

### 2. ツールについて対話
チャットで「テキストの頻出語を分析したい」「アンケートを集計したい」など、作りたいツールを伝えます。

### 3. ツールが生成される
AIがヒアリングを行い、要件を確認した上でツールを生成します。右側のプレビューパネルで即座に確認できます。

### 4. カスタマイズ
「カスタマイズ」タブでスライダーや色選択を使ってツールを調整できます。

### 5. 活用
- **ダウンロード**: HTMLファイルとして保存し、ブラウザで開くだけで使えます
- **新しいタブで開く**: ツールを別タブで開いて独立して利用できます

---

## 🔧 カスタマイズ

### システムプロンプトの変更
`lib/prompts.ts` を編集して、AIの振る舞いを調整できます。

### 分野の追加
`lib/prompts.ts` の `FIELDS` 配列と `FIELD_KNOWLEDGE` オブジェクトに追加してください。

### デザインの変更
`tailwind.config.js` でカラーテーマを変更できます。

---

## 📋 今後の拡張予定

- [ ] ユーザー認証（NextAuth.js）
- [ ] ツールの永続保存（Supabase）
- [ ] 独立ツールURLの生成
- [ ] コミュニティギャラリー
- [ ] ファイルアップロード対応
- [ ] Python実行環境（Pyodide）

---

## ライセンス

MIT License

---

## 問い合わせ

Research Forgeに関するご質問やフィードバックは、IssueまたはPull Requestでお寄せください。
