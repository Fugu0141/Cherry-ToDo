# Cherry

[English](./README.md) | [日本語](./README_ja.md)

Cherry は、タスクブロックを流れ・分岐・スケジュールとして整理するための、オープンソースのタスクフロー型 ToDo アプリです。

タスクを単なる平面のリストとして扱うのではなく、Cherry ではルートタスクから始めて、子タスクを枝のように伸ばしていけます。ボードは作業の流れを組み立てたり見渡したりするための場所で、今後のリストビューは「今日やること」や「近いうちにやること」をすばやく確認するための画面として想定されています。

> 現在の状態: プロトタイプ / OSS 移行初期
>
> リポジトリ名: `Cherry-ToDo`

## デモ

https://fugu0141.github.io/Cherry-ToDo/

## コンセプト

```text
タスクの流れを組み立ててから、今日やることを見つける。
```

Cherry は、次の考え方を大切にしています。

- ルートタスクは、プロジェクト・タグ・大きなカテゴリのように扱います。
- 子タスクは、実際に実行する作業を表します。
- タスク同士の関係を、リストだけではなく枝分かれとして表示します。
- 日付は便利ですが、Cherry の中心構造ではありません。
- 日付未設定のタスクは `today` ではなく、`unscheduled` として扱います。
- このプロジェクトは、オープンソース開発に向けて準備中です。

## 機能

現在のプロトタイプで使える機能:

- タスクブロック形式のカード
- ルートタスクの作成
- `+` ハンドルからドラッグして子タスクを作成
- 親子タスクのリンク表示
- 日付レーン
- ドラッグ & ドロップによるタスク移動
- 境界線や空白部分にドロップしたときの日付変更モーダル
- done / todo の切り替え
- 自動レイアウト
- Undo
- `localStorage` によるローカル保存
- 初回起動時のウェルカム / OSS 紹介ウィンドウ

計画中・検討中の機能:

- より良いスケジュールモデル: none / date / datetime
- 今日・今後のタスクを確認するリストビュー
- 同日内のサブフローレイアウト
- 大きなモーダルの代わりになるコンテキストポップアップ
- より良いモバイル UI とタッチ操作
- 寄付 / 支援への導線
- リリースノートへの導線
- コードベースの整理とモジュール分割

## 使い方

Cherry は静的な Web アプリです。ローカルで使う場合は、ブラウザで `index.html` を開いてください。

開発時は、ローカルの静的サーバーを使うことをおすすめします。

```bash
python -m http.server 8000
```

その後、次の URL を開きます。

```text
http://localhost:8000/
```

## リポジトリ構成

```text
.
├── index.html
├── style.css
├── app.js
├── ux-fix.css
├── ux-fix.js
├── mobile.js
├── safety-fix.css
├── safety-fix.js
├── final-fix.js
├── date-only-utils.js
├── date-target-fix.js
├── state-storage.js
├── mobile-flow-map.css
├── mobile-flow-map.js
├── welcome-splash.css
├── welcome-splash.js
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── PRODUCT_VISION.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── DATE_TARGET_SPEC.md
│   ├── LAYOUT_AND_SCHEDULE_SPEC.md
│   ├── UX_INTERACTION_SPEC.md
│   ├── MOBILE_UX_SPEC.md
│   ├── WELCOME_SPLASH_SPEC.md
│   ├── ROADMAP.md
│   ├── DEVELOPMENT_SETUP.md
│   ├── MANUAL_TEST_CHECKLIST.md
│   ├── KNOWN_ISSUES.md
│   ├── MIGRATION_NOTES.md
│   └── ORIGINALITY_REVIEW.md
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── README.md
├── README_ja.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── .gitignore
└── LICENSE
```

## ドキュメント

まずは次のドキュメントから読むのがおすすめです。

1. [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md)
2. [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md)
3. [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md)
4. [`docs/ROADMAP.md`](docs/ROADMAP.md)
5. [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md)
6. [`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md)
7. [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)
8. [`docs/DATE_TARGET_SPEC.md`](docs/DATE_TARGET_SPEC.md)
9. [`docs/LAYOUT_AND_SCHEDULE_SPEC.md`](docs/LAYOUT_AND_SCHEDULE_SPEC.md)
10. [`docs/UX_INTERACTION_SPEC.md`](docs/UX_INTERACTION_SPEC.md)
11. [`docs/MOBILE_UX_SPEC.md`](docs/MOBILE_UX_SPEC.md)
12. [`docs/WELCOME_SPLASH_SPEC.md`](docs/WELCOME_SPLASH_SPEC.md)
13. [`docs/MIGRATION_NOTES.md`](docs/MIGRATION_NOTES.md)
14. [`docs/ORIGINALITY_REVIEW.md`](docs/ORIGINALITY_REVIEW.md)

## 開発メモ

Cherry はもともと `Fugu0141.github.io/ToDo` で開発されており、オープンソース開発に向けて独立したリポジトリへ移行されました。

一部のファイル名・URL・リポジトリ名・内部互換用のキーには、移行互換性のために `Cherry-ToDo` や古いプロジェクト名が残っている場合があります。ユーザー向けのアプリ名やドキュメントでは `Cherry` を使ってください。

挙動を変更する前に、[`docs/MANUAL_TEST_CHECKLIST.md`](docs/MANUAL_TEST_CHECKLIST.md) を確認してください。既知のプロトタイプ上の制限は [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) で管理されています。

## コントリビュート

コードベースと仕様が共同開発に十分安定した後、コントリビューションを歓迎します。

Issue や Pull Request を開く前に、[`CONTRIBUTING.md`](CONTRIBUTING.md) を読んでください。

## ライセンス

MIT License. 詳細は [`LICENSE`](LICENSE) を参照してください。
