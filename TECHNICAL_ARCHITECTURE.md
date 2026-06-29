# Quest Sticky ToDo Technical Architecture

## 1. この文書の目的

この文書は、Quest Sticky ToDo の現在のプログラム構造・データ構造・描画処理・イベント処理・日付判定・整列処理を説明する技術ドキュメントである。

OSSとして開発者を募集・編成する際に、新規参加者がコードをリバースエンジニアリングしなくても、おおよその設計と動作を理解できることを目的とする。

この文書は、現状の実装を説明する部分と、今後整理すべき設計方針の両方を含む。

関連文書:

- `PROJECT_SPEC.md`
- `PRODUCT_VISION.md`
- `DATE_TARGET_SPEC.md`
- `LAYOUT_AND_SCHEDULE_SPEC.md`
- `UX_INTERACTION_SPEC.md`
- `MOBILE_UX_SPEC.md`

---

## 2. 技術スタック

現在の Quest Sticky ToDo は、GitHub Pages 上で動く静的Webアプリである。

主な構成:

```text
HTML
CSS
Vanilla JavaScript
localStorage
SVG
GitHub Pages
```

現時点では、React・Vue・Svelteなどのフレームワークは使っていない。

ビルド工程もなく、ブラウザがそのままHTML/CSS/JSを読み込む。

---

## 3. ディレクトリ構成

主なファイルは `ToDo/` にある。

```text
ToDo/
  index.html
  style.css
  app.js
  ux-fix.js
  mobile.js
  safety-fix.js
  final-fix.js
  date-target-fix.js

  PRODUCT_VISION.md
  PROJECT_SPEC.md
  DATE_TARGET_SPEC.md
  LAYOUT_AND_SCHEDULE_SPEC.md
  UX_INTERACTION_SPEC.md
  MOBILE_UX_SPEC.md
  TECHNICAL_ARCHITECTURE.md
```

### 3.1 `index.html`

アプリのDOM構造を持つ。

主な要素:

```text
#board
  ボード全体

#links
  親子関係の線を描くSVG

#lanes
  日付レーン本体

#dateHud
  日付ラベルやデバッグ表示用

#notes
  タスク付箋を配置するレイヤー

#ghost
  新規タスク作成中のゴースト付箋
```

また、タスク作成モーダルと日付変更モーダルも `index.html` に定義されている。

### 3.2 `style.css`

基本の見た目を定義する。

主な対象:

- アプリ全体
- ツールバー
- ボード
- 付箋
- 日付レーン
- モーダル
- PC横表示
- スマホ縦表示

### 3.3 `app.js`

アプリ本体の中心ファイル。

現在は多くの責務がこのファイルに集まっている。

主な責務:

- 状態管理
- localStorage保存
- タスク作成/編集/削除
- 描画
- SVGリンク描画
- 日付レーン描画
- ドラッグ処理
- ブランチ作成処理
- 自動整列
- Undo
- PC/スマホ表示切り替え

### 3.4 fix系ファイル

現在は、`app.js` の後に複数の修正レイヤーを読み込んでいる。

```text
ux-fix.js
mobile.js
safety-fix.js
final-fix.js
date-target-fix.js
```

これらは、既存の関数を後から上書きしたり、イベントを追加したりすることで、挙動を修正している。

短期的には有効だが、長期的には本体へ統合する必要がある。

---

## 4. 読み込み順

`index.html` では、概ね以下の順番でJavaScriptが読み込まれる。

```text
app.js
ux-fix.js
mobile.js
safety-fix.js
final-fix.js
date-target-fix.js
```

重要:

- 後に読み込まれたファイルが、前のファイルで定義された関数を上書きする場合がある。
- 特に `date-target-fix.js` は、日付判定と新規タスク作成中のゴースト挙動を上書きしている。
- デバッグ時は、`app.js` だけでなく後続のfixファイルの影響も必ず確認する。

---

## 5. 状態管理

### 5.1 グローバル状態

現在の実装では、アプリ状態は主にグローバル変数で管理される。

代表的な変数:

```js
let state = makeInitialState();
let selectedId = null;
let undoStack = [];
let drag = null;
let connectDrag = null;
let hotLaneDate = null;
let hotLineDate = null;
let cachedLaneDates = [];
```

### 5.2 `state`

中心となる状態オブジェクト。

現在の形:

```js
state = {
  tasks: {
    [taskId]: Task
  },
  showLanes: true
}
```

### 5.3 `Task`

現在のタスクデータは以下の形に近い。

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  targetAt: string,
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

意味:

```text
id:
  タスクID

title:
  表示名

parentId:
  親タスクID。ルートタスクでは null

x, y:
  ボード上の表示位置

targetAt:
  現在の期日。YYYY-MM-DD 形式

status:
  todo または done

branchMode:
  親から見た接続種別。same または branch
```

### 5.4 今後のTask構造

日付なし・日時指定対応後は、`targetAt` だけでは不足する。

将来的には以下へ移行する。

```js
Task = {
  id: string,
  title: string,
  parentId: string | null,
  x: number,
  y: number,
  schedule: {
    type: "none" | "date" | "datetime",
    date: string | null,
    time: string | null
  },
  status: "todo" | "done",
  branchMode: "same" | "branch" | null
}
```

移行中は、`targetAt` と `schedule` が一時的に併存する可能性がある。

---

## 6. 永続化

### 6.1 保存方式

現在は `localStorage` に `state` をJSON文字列として保存する。

保存キー:

```text
quest-sticky-todo-v10
```

### 6.2 保存タイミング

描画時に `scheduleSave()` が呼ばれ、短い遅延後に `saveNow()` が実行される。

また、ページ離脱時には `beforeunload` で保存される。

### 6.3 読み込み

起動時に `load()` が実行される。

現在は複数の古い保存キーも読み込み対象としている。

```text
quest-sticky-todo-v10
quest-sticky-todo-v9
quest-sticky-todo-v8
...
```

### 6.4 今後の課題

- データ移行処理を明示的に持つ
- 保存形式のバージョンをstate内に持つ
- JSONエクスポート/インポートを追加する
- localStorage破損時の復旧を用意する

---

## 7. レンダリング構造

### 7.1 基本フロー

描画は `requestRender()` から始まる。

```text
requestRender()
  → requestAnimationFrame
    → render()
```

`render()` は以下を行う。

```text
1. ensureContentSize()
2. scheduleSave()
3. updateMonthCard()
4. ツールバー状態更新
5. renderLanes()
6. renderLinks()
7. renderNotes()
```

### 7.2 `ensureContentSize()`

ボードの必要サイズを計算する。

主な処理:

- 日付レーンの更新
- PC/スマホ表示モードの判定
- 付箋サイズの同期
- ボードの最小幅/高さの調整
- SVG/レーン/ノートレイヤーのサイズ調整

### 7.3 `renderLanes()`

日付レーンを描画する。

表示内容:

- 日付帯
- 日付線
- 今日の線
- 月表示
- 日付ラベル
- 最後の終端線

`hotLaneDate` と `hotLineDate` により、ドラッグ中のハイライトを表示する。

### 7.4 `renderLinks()`

タスク同士の親子関係をSVGのpathとして描画する。

各タスクについて、親が存在する場合に線を作る。

PC横表示とスマホ縦表示で、線の作り方が異なる。

### 7.5 `renderNotes()`

タスク付箋を描画する。

各付箋には以下が含まれる。

- タスク名
- 削除ボタン
- 完了切り替えボタン
- ブランチ作成ハンドル

また、付箋本体にはドラッグ開始イベントが付く。

---

## 8. 座標系

Quest Sticky ToDo には、PC横表示とスマホ縦表示の2つの座標系がある。

### 8.1 PC横表示

```text
x軸: 日付
y軸: ブランチ/トラック
```

代表関数:

```js
hDateLineX(date)
hDateToX(date)
hTrackToY(track)
hEndLineX()
```

### 8.2 スマホ縦表示

```text
y軸: 日付
x軸: ブランチ/トラック
```

代表関数:

```js
vDateLineY(date)
vDateToY(date)
vTrackToX(track)
vEndLineY()
```

### 8.3 付箋サイズ

PCとスマホで付箋サイズが異なる。

```js
desktopNoteW = 220
desktopNoteH = 104
mobileNoteW = 176
mobileNoteH = 82
```

`syncMetrics()` によって現在モードのサイズがCSS変数へ反映される。

---

## 9. 日付レーン判定

### 9.1 現在の本体実装

`app.js` には `hitTestDateArea()` が存在する。

本体実装では、日付レーン内・区切り線・空白地帯を判定する。

ただし、現在の正式な挙動は `date-target-fix.js` によって上書きされている。

### 9.2 `date-target-fix.js` の役割

`date-target-fix.js` は、日付判定の現在の正に近い実装である。

主な役割:

- `hitTestDateArea()` の上書き
- `getDateForPointer()` の上書き
- 区切り線の候補日計算
- `date` と `targetDate` の分離
- JST/UTCズレを避ける `addDaysISO()`
- 新規タスク作成中のゴースト非吸着
- モーダル初期値の補正

### 9.3 hit結果

今後の標準形は以下。

```js
{
  kind: "lane" | "line" | "blank" | "none",
  date: "YYYY-MM-DD" | null,
  targetDate: "YYYY-MM-DD" | null,
  mode: "snap" | "ask" | "free"
}
```

意味:

```text
kind:
  どこに置かれたか

date:
  表示用の日付。主にホットライン表示に使う

targetDate:
  モーダル初期値や保存候補に使う日付

mode:
  snap = その日付に吸着
  ask = モーダル/ポップアップで確認
  free = 日付レーンと無関係
```

### 9.4 区切り線の考え方

区切り線では、表示用の日付と候補日が違う場合がある。

例:

```text
Jun 28 | Jul 3 の区切り線

date: 2026-07-03
targetDate: 2026-06-29
```

これは、紫のホットラインを右側の日付線に出しつつ、候補日は左側の日付+1日にするためである。

---

## 10. ドラッグ処理

### 10.1 既存タスク移動

付箋本体をpointer downすると `drag` が作成される。

```js
drag = {
  id,
  el,
  dx,
  dy,
  moved,
  original
}
```

pointer move中:

- タスク座標を更新
- 付箋DOM位置を更新
- 日付レーンのホット表示を更新

pointer up時:

- レーン内なら日付を変更して吸着
- 区切り線/空白なら日付変更UIを開く
- それ以外なら自由配置

### 10.2 新規ブランチ作成

付箋の `+` ハンドルをpointer downすると `connectDrag` が作成される。

```js
connectDrag = {
  parentId,
  x,
  y
}
```

pointer move中:

- ゴースト付箋を表示
- プレビュー線を表示
- 同じブランチか分岐かを推定
- 日付レーンのホット表示を更新

### 10.3 新規作成中の非吸着

現在は `date-target-fix.js` により、ブランチ作成中のゴースト付箋はドラッグ中に日付レーンへ吸着しない。

方針:

```text
ドラッグ中:
  自由に動く

ドロップ後:
  必要に応じて日付候補を反映
  保存後に整列
```

---

## 11. ブランチモード推定

### 11.1 `inferBranchMode()`

新規タスク作成時に、同じブランチか分岐かを推定する。

PC横表示:

```text
親タスクの中心yに近い → same
上下にずれている → branch
```

スマホ縦表示:

```text
親タスクの中心xに近い → same
左右にずれている → branch
```

### 11.2 今後の課題

スマホでは、指操作とスクロールが競合しやすい。

そのため、スマホ版ではPCと同じ推定方法をそのまま使わず、専用ハンドル・長押し・ボトムシートなどと組み合わせて再設計する。

---

## 12. モーダル処理

### 12.1 タスク作成/編集モーダル

現在は `openCreateTaskModal()` と `openEditTaskModal()` で中央モーダルを開く。

作成時:

```text
taskModalMode = "create"
taskModalContext = { parentId, targetAt, branchMode }
```

編集時:

```text
taskModalMode = "edit"
taskModalContext = { taskId }
```

保存時は `saveTaskModal()` が呼ばれる。

### 12.2 日付変更モーダル

区切り線や空白地帯に置いた場合、`openChangeDateModal()` が呼ばれる。

キャンセル時は、元の位置と日付へ戻す。

### 12.3 今後の方針

全面モーダルは、通常操作では減らす。

今後の置き換え:

```text
PC:
  コンテキストポップアップ

スマホ:
  ボトムシート
```

ただし、詳細編集・危険操作・リセットなどでは全面モーダルを残してもよい。

---

## 13. 自動整列

### 13.1 現在の処理

現在の整列は `branchLayout()` が中心である。

処理の流れ:

```text
branchLayout()
  refreshLaneDates()
  currentMode更新
  syncMetrics()
  roots取得
  assignBranchTracks()
  resolveTrackCollisions()
  applyTracksToPositions()
  deleteTempTracks()
```

### 13.2 `assignBranchTracks()`

親子関係をたどりながら、各タスクに一時的な `_track` を割り当てる。

- 同じブランチのメイン子タスクは親と同じtrackへ置く
- 分岐タスクは新しいtrackへ置く

### 13.3 `resolveTrackCollisions()`

同じ日付・同じtrackに複数タスクが重ならないように、trackをずらす。

現在の問題:

- 衝突回避のため下方向/横方向へ伸びやすい
- 分岐やルートが増えると全体が巨大化しやすい
- 同日タスクの親子関係が潰れて縦積みになりやすい

### 13.4 今後の方針

今後は、以下の考え方へ移行する。

```text
ルート単位サブツリー
日付あり/なし混在対応
日付枠内サブフロー
ハイブリッド整列
```

詳細は `LAYOUT_AND_SCHEDULE_SPEC.md` と `UX_INTERACTION_SPEC.md` を参照する。

---

## 14. 削除処理

### 14.1 現在の削除

`deleteTask()` は、削除対象の子タスクを親へ再接続してから、対象タスクを削除する。

現在の挙動:

```text
削除対象の子タスク
  → 削除対象の親へつなぎ替える
```

その後、日付レーン更新・整列・再描画を行う。

### 14.2 今後の課題

削除挙動は慎重に仕様化する必要がある。

検討候補:

```text
1. 子タスクを親へつなぎ替える
2. 子タスクも一緒に削除する
3. 子タスクをルート化する
4. 削除前にユーザーに選ばせる
```

OSS開発では、削除挙動の変更は破壊的変更になりやすいため、必ず仕様書を更新してから実装する。

---

## 15. Undo

### 15.1 現在のUndo

`undoStack` に `state` のJSON文字列を積む。

`snapshot()` が呼ばれた時点の状態が保存される。

現在の最大保持数:

```text
80
```

### 15.2 今後の課題

- 操作単位のUndoを明確にする
- localStorage保存との整合性を整理する
- モーダルキャンセル時の復元とUndoの関係を整理する

---

## 16. 現在の技術的負債

### 16.1 `app.js` が大きい

現在は多くの責務が `app.js` に集中している。

今後は分割する。

候補:

```text
state.js
storage.js
schedule.js
layout.js
render-board.js
render-lanes.js
render-links.js
interaction-drag.js
interaction-create.js
ui-modal.js
ui-popup.js
mobile-ui.js
```

### 16.2 fixファイルが積み重なっている

現在は後読み込みのfixファイルで重要な挙動を上書きしている。

短期的には動いているが、長期保守には向かない。

今後の方針:

```text
1. fixファイルの責務を一覧化する
2. 安定済み仕様を本体へ統合する
3. 関数上書きを減らす
4. 最終的にfixファイルを削除または整理する
```

### 16.3 日付処理が `today` に寄りやすい

現在の `normalizeDate()` は空値を `todayISO()` に寄せる。

日付なし対応では危険。

今後は以下を分離する。

```text
normalizeDateStrict()
normalizeSchedule()
todayISO()
```

### 16.4 PCとスマホの責務が混ざっている

現在はPC横表示とスマホ縦表示を同じ関数内で分岐している。

今後は、共有ロジックとUI固有ロジックを分ける。

---

## 17. 推奨モジュール設計

将来的には、以下の責務分離を目指す。

```text
core/
  task-model.js
  schedule-model.js
  tree-utils.js

storage/
  local-storage.js
  migration.js

layout/
  date-axis-layout.js
  flow-layout.js
  hybrid-layout.js
  same-day-subflow.js

render/
  board-view.js
  lane-view.js
  link-view.js
  note-view.js
  list-view.js

interaction/
  drag-task.js
  create-branch.js
  selection.js
  keyboard.js

ui/
  task-popup.js
  date-popup.js
  confirm-popup.js
  bottom-sheet.js

mobile/
  mobile-list-view.js
  mobile-flow-view.js
  touch-gestures.js
```

この分割は一度に行わない。

まずは既存機能を壊さず、安定した部分から切り出す。

---

## 18. 開発時の注意点

### 18.1 日付判定を複数箇所に増やさない

日付レーン判定はバグりやすい。

特に区切り線・空白地帯・日付飛び・JST/UTC問題がある。

今後は、単一の判定関数に集約する。

### 18.2 表示用日付と保存候補日を混同しない

以下は必ず分ける。

```text
date:
  表示用。ホットライン表示など

targetDate:
  保存候補。モーダル初期値など
```

### 18.3 操作中と確定後を分ける

ドラッグ中の見た目補正と、ドロップ後の保存・整列を混同しない。

```text
操作中:
  ユーザーの指/カーソルに追従

確定後:
  必要に応じて吸着・整列
```

### 18.4 スマホではPC操作をそのまま持ち込まない

スマホでは、スクロール・長押し・ドラッグ・入力の衝突が起きやすい。

UI設計は `MOBILE_UX_SPEC.md` を優先する。

---

## 19. 変更時のチェックリスト

変更後は最低限以下を確認する。

### 19.1 基本操作

- ルートタスクを作成できる
- ブランチを作成できる
- 同じブランチと分岐を作れる
- タスクを編集できる
- タスクを削除できる
- 完了切り替えできる
- Undoできる

### 19.2 日付レーン

- レーン内へ置くとその日付になる
- 区切り線へ置くと候補日が正しい
- 日付が飛んでいても候補日が正しい
- 最後の日付の先の空白地帯が正しい
- JSTで候補日が1日前にずれない

### 19.3 新規ブランチ作成

- ドラッグ中に勝手に日付レーンへ吸着しない
- レーン判定のハイライトは出る
- ドロップ後の初期日付が正しい
- 保存後に整列される

### 19.4 レイアウト

- PC横表示で破綻しない
- スマホ縦表示で破綻しない
- 分岐があるタスクの線が読める
- 同じ日付のタスクが重なりすぎない

### 19.5 保存

- リロード後も状態が残る
- 古い保存データを読める
- リセットできる

---

## 20. OSS貢献者向けの読み順

新しく参加する開発者は、以下の順で読むと理解しやすい。

```text
1. PROJECT_SPEC.md
2. PRODUCT_VISION.md
3. TECHNICAL_ARCHITECTURE.md
4. DATE_TARGET_SPEC.md
5. LAYOUT_AND_SCHEDULE_SPEC.md
6. UX_INTERACTION_SPEC.md
7. MOBILE_UX_SPEC.md
8. app.js
9. date-target-fix.js
10. その他fixファイル
```

まず仕様を理解し、その後に実装を見る。

コードだけを読んで仕様を判断しないこと。

---

## 21. 今後の最初の技術タスク

OSS化に向けた最初の技術タスクは以下。

1. 既存ドキュメントへのリンクをREADMEに追加する
2. fixファイルの責務一覧を作る
3. 日付判定の正式実装を本体へ統合する
4. `targetAt` から `schedule` への移行計画を作る
5. レイアウトロジックのテストケースを作る
6. スマホ版のUI再設計に入る前に、共有データ構造を固める

---

## 22. まとめ

現状のQuest Sticky ToDoは、動くプロトタイプとして重要な機能がすでに揃っている。

一方で、OSSとして長期保守するには以下が必要である。

- 仕様と実装を分けて理解できるドキュメント
- fixレイヤーの整理
- 日付なし・日時指定に耐えられるデータ構造
- PC/スマホのUI責務分離
- レイアウトアルゴリズムの明確化

この文書は、その整理の入口として使う。
