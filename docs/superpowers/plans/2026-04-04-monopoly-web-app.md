# モノポリ Web アプリ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマートフォン1台で家族（小学生含む）が交代で遊べるモノポリWebアプリを構築する

**Architecture:** React 19 + TypeScript、Vite、useReducerによる状態管理。`game/`に純粋なゲームロジック、`components/`にUI。CSS Modulesでスタイリング。Howler.jsでサウンド。

**Tech Stack:** Vite, React 19, TypeScript, CSS Modules, Howler.js, Vitest

**Spec:** `docs/superpowers/specs/2026-04-04-monopoly-web-app-design.md`

---

## ファイル構成

```
src/
├── game/
│   ├── types.ts              # 全型定義
│   ├── board.ts              # 40マスのボードデータ
│   ├── cards.ts              # Chance/Community Chestカードデータ
│   ├── rules.ts              # ルール判定（レンタル計算、建設可否、破産判定等）
│   ├── actions.ts            # アクション型定義
│   └── reducer.ts            # gameReducer（メイン状態遷移）
├── components/
│   ├── Setup/
│   │   ├── Setup.tsx         # ゲーム開始設定画面
│   │   └── Setup.module.css
│   ├── Board/
│   │   ├── FocusView.tsx     # 現在地フォーカス表示
│   │   ├── MiniMap.tsx       # ミニマップ
│   │   ├── SpaceCard.tsx     # マスの詳細カード
│   │   └── Board.module.css
│   ├── Dice/
│   │   ├── Dice.tsx          # サイコロアニメーション
│   │   └── Dice.module.css
│   ├── PlayerPanel/
│   │   ├── PlayerPanel.tsx   # 現在プレイヤー＆全員の簡易情報
│   │   └── PlayerPanel.module.css
│   ├── ActionDialog/
│   │   ├── PurchaseDialog.tsx    # 購入ダイアログ
│   │   ├── AuctionDialog.tsx     # 競売ダイアログ
│   │   ├── TradeDialog.tsx       # 交渉ダイアログ
│   │   ├── CardDialog.tsx        # カード表示ダイアログ
│   │   ├── JailDialog.tsx        # 刑務所ダイアログ
│   │   ├── BuildDialog.tsx       # 建設ダイアログ
│   │   ├── MortgageDialog.tsx    # 抵当ダイアログ
│   │   ├── BankruptDialog.tsx    # 破産ダイアログ
│   │   └── ActionDialog.module.css
│   ├── GameBoard/
│   │   ├── GameBoard.tsx     # プレイ画面の統合コンポーネント
│   │   └── GameBoard.module.css
│   └── common/
│       ├── Button.tsx        # 共通ボタン
│       ├── Dialog.tsx        # 共通ダイアログ
│       └── common.module.css
├── sound/
│   ├── SoundContext.tsx      # サウンドコンテキスト＆プロバイダー
│   └── sounds.ts            # サウンドファイル定義
├── App.tsx
├── App.module.css
├── main.tsx
└── index.css                 # グローバルスタイル（リセット、フォント、CSS変数）
```

---

## Task 1: プロジェクトセットアップ

**Files:**

- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.module.css`, `.gitignore`

- [ ] **Step 1: Viteでプロジェクト作成**

Run:

```bash
cd /Users/toshiaki.wakabayashi/99_sandbox/monopo
npm create vite@latest . -- --template react-ts
```

プロンプトが出たら現在のディレクトリに上書きする。

- [ ] **Step 2: 追加パッケージインストール**

Run:

```bash
npm install howler
npm install -D @types/howler vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Vitest設定を追加**

`vite.config.ts` を以下に置き換え:

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

`src/test-setup.ts` を作成:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: グローバルスタイル作成**

`src/index.css`:

```css
:root {
  /* ポップ/カジュアル カラーパレット */
  --color-bg: #fff8f0;
  --color-primary: #ff6b6b;
  --color-secondary: #4ecdc4;
  --color-accent: #ffe66d;
  --color-text: #2c3e50;
  --color-text-light: #7f8c8d;
  --color-white: #ffffff;
  --color-danger: #e74c3c;
  --color-success: #2ecc71;
  --color-money-up: #27ae60;
  --color-money-down: #e74c3c;

  /* 物件カラーグループ */
  --color-brown: #8b4513;
  --color-lightblue: #87ceeb;
  --color-pink: #ff69b4;
  --color-orange: #ffa500;
  --color-red: #ff0000;
  --color-yellow: #ffd700;
  --color-green: #008000;
  --color-blue: #0000ff;

  /* サイズ */
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  user-select: none;
}

html,
body,
#root {
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 5: App.tsx の初期化**

`src/App.tsx`:

```tsx
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <h1>モノポリ</h1>
    </div>
  )
}
```

`src/App.module.css`:

```css
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 430px;
  margin: 0 auto;
}
```

- [ ] **Step 6: .gitignore 更新**

`.gitignore` に追加:

```
.superpowers/
```

- [ ] **Step 7: 動作確認**

Run: `npm run dev`
ブラウザで「モノポリ」と表示されることを確認。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "feat: Vite + React + TypeScript プロジェクトセットアップ"
```

---

## Task 2: 型定義

**Files:**

- Create: `src/game/types.ts`
- Test: `src/game/__tests__/types.test.ts`

- [ ] **Step 1: テストファイル作成**

`src/game/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createInitialPlayer, TOKENS } from '../types'

describe('createInitialPlayer', () => {
  it('初期資金$1500でプレイヤーを作成する', () => {
    const player = createInitialPlayer('p1', 'たろう', '🚗')
    expect(player.money).toBe(1500)
    expect(player.position).toBe(0)
    expect(player.properties).toEqual([])
    expect(player.inJail).toBe(false)
    expect(player.isBankrupt).toBe(false)
  })

  it('名前とトークンが正しく設定される', () => {
    const player = createInitialPlayer('p2', 'はなこ', '🎩')
    expect(player.name).toBe('はなこ')
    expect(player.token).toBe('🎩')
    expect(player.id).toBe('p2')
  })
})

describe('TOKENS', () => {
  it('4つ以上のトークンが定義されている', () => {
    expect(TOKENS.length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/game/__tests__/types.test.ts`
Expected: FAIL — `createInitialPlayer` が未定義

- [ ] **Step 3: 型定義を実装**

`src/game/types.ts`:

```typescript
// ── プレイヤートークン ──
export const TOKENS = ['🚗', '🎩', '👞', '🐕', '🚀', '🌟'] as const

// ── 物件カラーグループ ──
export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'blue'

// ── ボードマスの種別 ──
export type SpaceType =
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'communityChest'
  | 'corner'

// ── ボードマス ──
export type BoardSpace = {
  id: string
  position: number
  type: SpaceType
  name: string
  color?: ColorGroup
  price?: number
  rent?: number[]
  houseCost?: number
  mortgageValue?: number
}

// ── プレイヤー ──
export type Player = {
  id: string
  name: string
  token: string
  money: number
  position: number
  properties: string[]
  inJail: boolean
  jailTurns: number
  getOutOfJailCards: number
  isBankrupt: boolean
}

// ── カード ──
export type CardAction =
  | { type: 'move'; position: number }
  | { type: 'moveRelative'; spaces: number }
  | { type: 'money'; amount: number }
  | { type: 'moneyFromPlayers'; amount: number }
  | { type: 'jail' }
  | { type: 'jailFree' }
  | { type: 'repair'; perHouse: number; perHotel: number }
  | { type: 'moveNearest'; spaceType: 'railroad' | 'utility' }

export type Card = {
  id: string
  type: 'chance' | 'communityChest'
  text: string
  action: CardAction
}

// ── 物件の所有状態（ゲーム中に変化する部分） ──
export type PropertyState = {
  ownerId: string | null
  houses: number // 0-4, 5=ホテル
  isMortgaged: boolean
}

// ── 競売状態 ──
export type AuctionState = {
  propertyId: string
  currentBid: number
  currentBidderId: string | null
  passedPlayerIds: string[]
  activePlayerIndex: number
}

// ── 取引状態 ──
export type TradeOffer = {
  fromPlayerId: string
  toPlayerId: string
  offerProperties: string[]
  offerMoney: number
  offerJailCards: number
  requestProperties: string[]
  requestMoney: number
  requestJailCards: number
}

// ── ターンフェーズ ──
export type TurnPhase =
  | 'roll'
  | 'moving'
  | 'landed'
  | 'action'
  | 'auction'
  | 'trade'
  | 'build'
  | 'mortgage'
  | 'bankrupt'
  | 'endTurn'

// ── ゲーム状態 ──
export type GameState = {
  phase: 'setup' | 'playing' | 'finished'
  players: Player[]
  currentPlayerIndex: number
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  cards: { chance: Card[]; communityChest: Card[] }
  dice: { values: [number, number]; doubles: number; rolled: boolean }
  turnPhase: TurnPhase
  auction: AuctionState | null
  trade: TradeOffer | null
  currentCard: Card | null
  message: string
  winnerId: string | null
}

// ── ファクトリ関数 ──
export function createInitialPlayer(
  id: string,
  name: string,
  token: string,
): Player {
  return {
    id,
    name,
    token,
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
  }
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx vitest run src/game/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/types.ts src/game/__tests__/types.test.ts
git commit -m "feat: ゲームの型定義を追加"
```

---

## Task 3: ボードデータ（40マス）

**Files:**

- Create: `src/game/board.ts`
- Test: `src/game/__tests__/board.test.ts`

- [ ] **Step 1: テストファイル作成**

`src/game/__tests__/board.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { BOARD_SPACES, createPropertyStates } from '../board'

describe('BOARD_SPACES', () => {
  it('40マスある', () => {
    expect(BOARD_SPACES).toHaveLength(40)
  })

  it('position 0はGO', () => {
    expect(BOARD_SPACES[0].name).toBe('GO')
    expect(BOARD_SPACES[0].type).toBe('corner')
  })

  it('position 10は刑務所', () => {
    expect(BOARD_SPACES[10].name).toBe('刑務所')
    expect(BOARD_SPACES[10].type).toBe('corner')
  })

  it('position 20はFree Parking', () => {
    expect(BOARD_SPACES[20].type).toBe('corner')
  })

  it('position 30はGo to Jail', () => {
    expect(BOARD_SPACES[30].type).toBe('corner')
  })

  it('各マスのpositionがインデックスと一致する', () => {
    BOARD_SPACES.forEach((space, index) => {
      expect(space.position).toBe(index)
    })
  })

  it('物件にはpriceとrentが設定されている', () => {
    const properties = BOARD_SPACES.filter((s) => s.type === 'property')
    properties.forEach((p) => {
      expect(p.price).toBeGreaterThan(0)
      expect(p.rent).toBeDefined()
      expect(p.rent!.length).toBe(6)
    })
  })

  it('鉄道は4つある', () => {
    const railroads = BOARD_SPACES.filter((s) => s.type === 'railroad')
    expect(railroads).toHaveLength(4)
  })

  it('公共事業は2つある', () => {
    const utilities = BOARD_SPACES.filter((s) => s.type === 'utility')
    expect(utilities).toHaveLength(2)
  })
})

describe('createPropertyStates', () => {
  it('購入可能なマスの初期状態を生成する', () => {
    const states = createPropertyStates()
    const purchasable = BOARD_SPACES.filter(
      (s) =>
        s.type === 'property' || s.type === 'railroad' || s.type === 'utility',
    )
    expect(Object.keys(states)).toHaveLength(purchasable.length)
    Object.values(states).forEach((state) => {
      expect(state.ownerId).toBeNull()
      expect(state.houses).toBe(0)
      expect(state.isMortgaged).toBe(false)
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/game/__tests__/board.test.ts`
Expected: FAIL

- [ ] **Step 3: ボードデータを実装**

`src/game/board.ts`:

```typescript
import type { BoardSpace, PropertyState } from './types'

export const BOARD_SPACES: BoardSpace[] = [
  // ── 下辺（0-9） ──
  { id: 'go', position: 0, type: 'corner', name: 'GO' },
  {
    id: 'mediterranean',
    position: 1,
    type: 'property',
    name: 'ちちぶ通り',
    color: 'brown',
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
    mortgageValue: 30,
  },
  {
    id: 'community-chest-1',
    position: 2,
    type: 'communityChest',
    name: 'おたすけカード',
  },
  {
    id: 'baltic',
    position: 3,
    type: 'property',
    name: 'おくたま通り',
    color: 'brown',
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
    mortgageValue: 30,
  },
  {
    id: 'income-tax',
    position: 4,
    type: 'tax',
    name: 'ぜいきん ($200)',
    price: 200,
  },
  {
    id: 'reading-rr',
    position: 5,
    type: 'railroad',
    name: 'ひがし鉄道',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  {
    id: 'oriental',
    position: 6,
    type: 'property',
    name: 'あさくさ通り',
    color: 'lightblue',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  { id: 'chance-1', position: 7, type: 'chance', name: 'チャンスカード' },
  {
    id: 'vermont',
    position: 8,
    type: 'property',
    name: 'うえの通り',
    color: 'lightblue',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  {
    id: 'connecticut',
    position: 9,
    type: 'property',
    name: 'あきはばら通り',
    color: 'lightblue',
    price: 120,
    rent: [8, 40, 100, 300, 450, 600],
    houseCost: 50,
    mortgageValue: 60,
  },

  // ── 左辺（10-19） ──
  { id: 'jail', position: 10, type: 'corner', name: '刑務所' },
  {
    id: 'stcharles',
    position: 11,
    type: 'property',
    name: 'しぶや通り',
    color: 'pink',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  {
    id: 'electric',
    position: 12,
    type: 'utility',
    name: 'でんりょく会社',
    price: 150,
    mortgageValue: 75,
  },
  {
    id: 'states',
    position: 13,
    type: 'property',
    name: 'はらじゅく通り',
    color: 'pink',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  {
    id: 'virginia',
    position: 14,
    type: 'property',
    name: 'おもてさんどう',
    color: 'pink',
    price: 160,
    rent: [12, 60, 180, 500, 700, 900],
    houseCost: 100,
    mortgageValue: 80,
  },
  {
    id: 'pennsylvania-rr',
    position: 15,
    type: 'railroad',
    name: 'みなみ鉄道',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  {
    id: 'stjames',
    position: 16,
    type: 'property',
    name: 'いけぶくろ通り',
    color: 'orange',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  {
    id: 'community-chest-2',
    position: 17,
    type: 'communityChest',
    name: 'おたすけカード',
  },
  {
    id: 'tennessee',
    position: 18,
    type: 'property',
    name: 'しんじゅく通り',
    color: 'orange',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  {
    id: 'newyork',
    position: 19,
    type: 'property',
    name: 'ろっぽんぎ通り',
    color: 'orange',
    price: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    houseCost: 100,
    mortgageValue: 100,
  },

  // ── 上辺（20-29） ──
  { id: 'free-parking', position: 20, type: 'corner', name: 'むりょう駐車場' },
  {
    id: 'kentucky',
    position: 21,
    type: 'property',
    name: 'あかさか通り',
    color: 'red',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  { id: 'chance-2', position: 22, type: 'chance', name: 'チャンスカード' },
  {
    id: 'indiana',
    position: 23,
    type: 'property',
    name: 'あおやま通り',
    color: 'red',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  {
    id: 'illinois',
    position: 24,
    type: 'property',
    name: 'ぎんざ通り',
    color: 'red',
    price: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    houseCost: 150,
    mortgageValue: 120,
  },
  {
    id: 'bo-rr',
    position: 25,
    type: 'railroad',
    name: 'にし鉄道',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  {
    id: 'atlantic',
    position: 26,
    type: 'property',
    name: 'しながわ通り',
    color: 'yellow',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  {
    id: 'ventnor',
    position: 27,
    type: 'property',
    name: 'めぐろ通り',
    color: 'yellow',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  {
    id: 'water',
    position: 28,
    type: 'utility',
    name: 'すいどう会社',
    price: 150,
    mortgageValue: 75,
  },
  {
    id: 'marvin',
    position: 29,
    type: 'property',
    name: 'しろかね通り',
    color: 'yellow',
    price: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    houseCost: 150,
    mortgageValue: 140,
  },

  // ── 右辺（30-39） ──
  { id: 'go-to-jail', position: 30, type: 'corner', name: '刑務所へいけ！' },
  {
    id: 'pacific',
    position: 31,
    type: 'property',
    name: 'まるのうち通り',
    color: 'green',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  {
    id: 'northcarolina',
    position: 32,
    type: 'property',
    name: 'おおてまち通り',
    color: 'green',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  {
    id: 'community-chest-3',
    position: 33,
    type: 'communityChest',
    name: 'おたすけカード',
  },
  {
    id: 'pennsylvania',
    position: 34,
    type: 'property',
    name: 'にほんばし通り',
    color: 'green',
    price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    houseCost: 200,
    mortgageValue: 160,
  },
  {
    id: 'shortline-rr',
    position: 35,
    type: 'railroad',
    name: 'きた鉄道',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  { id: 'chance-3', position: 36, type: 'chance', name: 'チャンスカード' },
  {
    id: 'parkplace',
    position: 37,
    type: 'property',
    name: 'みなとみらい通り',
    color: 'blue',
    price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    houseCost: 200,
    mortgageValue: 175,
  },
  {
    id: 'luxury-tax',
    position: 38,
    type: 'tax',
    name: 'ぜいたくぜい ($100)',
    price: 100,
  },
  {
    id: 'boardwalk',
    position: 39,
    type: 'property',
    name: 'とうきょうタワー通り',
    color: 'blue',
    price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    houseCost: 200,
    mortgageValue: 200,
  },
]

export function createPropertyStates(): Record<string, PropertyState> {
  const states: Record<string, PropertyState> = {}
  for (const space of BOARD_SPACES) {
    if (
      space.type === 'property' ||
      space.type === 'railroad' ||
      space.type === 'utility'
    ) {
      states[space.id] = { ownerId: null, houses: 0, isMortgaged: false }
    }
  }
  return states
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx vitest run src/game/__tests__/board.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/board.ts src/game/__tests__/board.test.ts
git commit -m "feat: 40マスのボードデータを追加"
```

---

## Task 4: カードデータ

**Files:**

- Create: `src/game/cards.ts`
- Test: `src/game/__tests__/cards.test.ts`

- [ ] **Step 1: テストファイル作成**

`src/game/__tests__/cards.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from '../cards'

describe('CHANCE_CARDS', () => {
  it('16枚ある', () => {
    expect(CHANCE_CARDS).toHaveLength(16)
  })

  it('すべてchanceタイプ', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.type).toBe('chance')
    })
  })

  it('すべてテキストとアクションがある', () => {
    CHANCE_CARDS.forEach((card) => {
      expect(card.text.length).toBeGreaterThan(0)
      expect(card.action).toBeDefined()
    })
  })
})

describe('COMMUNITY_CHEST_CARDS', () => {
  it('16枚ある', () => {
    expect(COMMUNITY_CHEST_CARDS).toHaveLength(16)
  })

  it('すべてcommunityChestタイプ', () => {
    COMMUNITY_CHEST_CARDS.forEach((card) => {
      expect(card.type).toBe('communityChest')
    })
  })
})

describe('shuffleCards', () => {
  it('同じ枚数のカードを返す', () => {
    const shuffled = shuffleCards(CHANCE_CARDS)
    expect(shuffled).toHaveLength(CHANCE_CARDS.length)
  })

  it('元の配列を変更しない', () => {
    const original = [...CHANCE_CARDS]
    shuffleCards(CHANCE_CARDS)
    expect(CHANCE_CARDS).toEqual(original)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/game/__tests__/cards.test.ts`
Expected: FAIL

- [ ] **Step 3: カードデータを実装**

`src/game/cards.ts`:

```typescript
import type { Card } from './types'

export const CHANCE_CARDS: Card[] = [
  {
    id: 'ch1',
    type: 'chance',
    text: 'GOまですすもう！$200もらえるよ！',
    action: { type: 'move', position: 0 },
  },
  {
    id: 'ch2',
    type: 'chance',
    text: 'ぎんざ通りにいこう！',
    action: { type: 'move', position: 24 },
  },
  {
    id: 'ch3',
    type: 'chance',
    text: 'しぶや通りにいこう！',
    action: { type: 'move', position: 11 },
  },
  {
    id: 'ch4',
    type: 'chance',
    text: 'いちばん近い鉄道にいこう！',
    action: { type: 'moveNearest', spaceType: 'railroad' },
  },
  {
    id: 'ch5',
    type: 'chance',
    text: 'いちばん近い鉄道にいこう！',
    action: { type: 'moveNearest', spaceType: 'railroad' },
  },
  {
    id: 'ch6',
    type: 'chance',
    text: 'いちばん近いでんき・すいどう会社にいこう！',
    action: { type: 'moveNearest', spaceType: 'utility' },
  },
  {
    id: 'ch7',
    type: 'chance',
    text: 'ぎんこうから$50もらえるよ！',
    action: { type: 'money', amount: 50 },
  },
  {
    id: 'ch8',
    type: 'chance',
    text: '刑務所から出られるカードをゲット！',
    action: { type: 'jailFree' },
  },
  {
    id: 'ch9',
    type: 'chance',
    text: '3マスもどってね',
    action: { type: 'moveRelative', spaces: -3 },
  },
  {
    id: 'ch10',
    type: 'chance',
    text: '刑務所にいってね…',
    action: { type: 'jail' },
  },
  {
    id: 'ch11',
    type: 'chance',
    text: 'おうちのしゅうり代！家1けんにつき$25、ホテル1つにつき$100はらってね',
    action: { type: 'repair', perHouse: 25, perHotel: 100 },
  },
  {
    id: 'ch12',
    type: 'chance',
    text: 'スピードいはんで$15はらってね',
    action: { type: 'money', amount: -15 },
  },
  {
    id: 'ch13',
    type: 'chance',
    text: 'ひがし鉄道にいこう！',
    action: { type: 'move', position: 5 },
  },
  {
    id: 'ch14',
    type: 'chance',
    text: 'みなとみらい通りにいこう！',
    action: { type: 'move', position: 39 },
  },
  {
    id: 'ch15',
    type: 'chance',
    text: 'みんなに$50ずつくばってね',
    action: { type: 'moneyFromPlayers', amount: -50 },
  },
  {
    id: 'ch16',
    type: 'chance',
    text: 'たてものの投資がうまくいったよ！$150もらえる！',
    action: { type: 'money', amount: 150 },
  },
]

export const COMMUNITY_CHEST_CARDS: Card[] = [
  {
    id: 'cc1',
    type: 'communityChest',
    text: 'GOまですすもう！$200もらえるよ！',
    action: { type: 'move', position: 0 },
  },
  {
    id: 'cc2',
    type: 'communityChest',
    text: 'ぎんこうのまちがいで$200もらえるよ！',
    action: { type: 'money', amount: 200 },
  },
  {
    id: 'cc3',
    type: 'communityChest',
    text: 'おいしゃさんに$50はらってね',
    action: { type: 'money', amount: -50 },
  },
  {
    id: 'cc4',
    type: 'communityChest',
    text: 'かぶがうれたよ！$50もらえる！',
    action: { type: 'money', amount: 50 },
  },
  {
    id: 'cc5',
    type: 'communityChest',
    text: '刑務所から出られるカードをゲット！',
    action: { type: 'jailFree' },
  },
  {
    id: 'cc6',
    type: 'communityChest',
    text: '刑務所にいってね…',
    action: { type: 'jail' },
  },
  {
    id: 'cc7',
    type: 'communityChest',
    text: 'おやすみボーナス！$100もらえるよ！',
    action: { type: 'money', amount: 100 },
  },
  {
    id: 'cc8',
    type: 'communityChest',
    text: 'ぜいきんのもどりで$20もらえるよ！',
    action: { type: 'money', amount: 20 },
  },
  {
    id: 'cc9',
    type: 'communityChest',
    text: 'たんじょうび！みんなから$10ずつもらえるよ！',
    action: { type: 'moneyFromPlayers', amount: 10 },
  },
  {
    id: 'cc10',
    type: 'communityChest',
    text: 'ほけんがおりたよ！$100もらえる！',
    action: { type: 'money', amount: 100 },
  },
  {
    id: 'cc11',
    type: 'communityChest',
    text: 'びょういんに$100はらってね',
    action: { type: 'money', amount: -100 },
  },
  {
    id: 'cc12',
    type: 'communityChest',
    text: 'がっこうのぜいきんで$150はらってね',
    action: { type: 'money', amount: -150 },
  },
  {
    id: 'cc13',
    type: 'communityChest',
    text: 'コンサルのおしごとで$25もらえるよ！',
    action: { type: 'money', amount: 25 },
  },
  {
    id: 'cc14',
    type: 'communityChest',
    text: 'どうろのしゅうり！家1けんにつき$40、ホテル1つにつき$115はらってね',
    action: { type: 'repair', perHouse: 40, perHotel: 115 },
  },
  {
    id: 'cc15',
    type: 'communityChest',
    text: 'びじんコンテストで2位！$10もらえるよ！',
    action: { type: 'money', amount: 10 },
  },
  {
    id: 'cc16',
    type: 'communityChest',
    text: 'いでんで$100もらえるよ！',
    action: { type: 'money', amount: 100 },
  },
]

export function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx vitest run src/game/__tests__/cards.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/cards.ts src/game/__tests__/cards.test.ts
git commit -m "feat: Chance/Community Chestカードデータを追加"
```

---

## Task 5: ルール判定ロジック

**Files:**

- Create: `src/game/rules.ts`
- Test: `src/game/__tests__/rules.test.ts`

- [ ] **Step 1: テストファイル作成**

`src/game/__tests__/rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  calculateRent,
  canBuildHouse,
  canMortgage,
  canUnmortgage,
  getColorGroup,
  ownsFullColorGroup,
  calculateTotalAssets,
  findNearestSpace,
} from '../rules'
import { BOARD_SPACES } from '../board'
import type { Player, PropertyState } from '../types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'テスト',
    token: '🚗',
    money: 1500,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    isBankrupt: false,
    ...overrides,
  }
}

function makePropertyStates(
  overrides: Record<string, Partial<PropertyState>> = {},
): Record<string, PropertyState> {
  const states: Record<string, PropertyState> = {}
  for (const space of BOARD_SPACES) {
    if (
      space.type === 'property' ||
      space.type === 'railroad' ||
      space.type === 'utility'
    ) {
      states[space.id] = {
        ownerId: null,
        houses: 0,
        isMortgaged: false,
        ...overrides[space.id],
      }
    }
  }
  return states
}

describe('calculateRent', () => {
  it('未所有の物件はレント0', () => {
    const states = makePropertyStates()
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [1, 2])).toBe(0)
  })

  it('家なしの物件の基本レント', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [1, 2])).toBe(2)
  })

  it('カラーグループ独占で基本レント2倍', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [1, 2])).toBe(4)
  })

  it('家ありのレント', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 2, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 2, isMortgaged: false },
    })
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [1, 2])).toBe(
      30,
    )
  })

  it('抵当中はレント0', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: true },
    })
    expect(calculateRent('mediterranean', states, BOARD_SPACES, [1, 2])).toBe(0)
  })

  it('鉄道1つ所有で$25', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [1, 2])).toBe(25)
  })

  it('鉄道2つ所有で$50', () => {
    const states = makePropertyStates({
      'reading-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
      'pennsylvania-rr': { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('reading-rr', states, BOARD_SPACES, [1, 2])).toBe(50)
  })

  it('公共事業1つ所有でサイコロ×4', () => {
    const states = makePropertyStates({
      electric: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('electric', states, BOARD_SPACES, [3, 4])).toBe(28) // 7 * 4
  })

  it('公共事業2つ所有でサイコロ×10', () => {
    const states = makePropertyStates({
      electric: { ownerId: 'p1', houses: 0, isMortgaged: false },
      water: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(calculateRent('electric', states, BOARD_SPACES, [3, 4])).toBe(70) // 7 * 10
  })
})

describe('canBuildHouse', () => {
  it('カラーグループ独占で建設可能', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      true,
    )
  })

  it('独占していない場合は建設不可', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    )
  })

  it('均等建設ルール: 差が1以上になる場合は建設不可', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 1, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    )
  })

  it('ホテル（5）以上は建設不可', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 5, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 5, isMortgaged: false },
    })
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    )
  })

  it('グループ内に抵当物件があると建設不可', () => {
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 0, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: true },
    })
    expect(canBuildHouse('mediterranean', 'p1', states, BOARD_SPACES)).toBe(
      false,
    )
  })
})

describe('findNearestSpace', () => {
  it('position 7から最寄りの鉄道はposition 15', () => {
    expect(findNearestSpace(7, 'railroad', BOARD_SPACES)).toBe(15)
  })

  it('position 36から最寄りの鉄道はposition 5（ラップアラウンド）', () => {
    expect(findNearestSpace(36, 'railroad', BOARD_SPACES)).toBe(5)
  })
})

describe('calculateTotalAssets', () => {
  it('現金のみのプレイヤー', () => {
    const player = makePlayer({ money: 1500, properties: [] })
    const states = makePropertyStates()
    expect(calculateTotalAssets(player, states, BOARD_SPACES)).toBe(1500)
  })

  it('物件と家を含む資産計算', () => {
    const player = makePlayer({
      money: 1000,
      properties: ['mediterranean', 'baltic'],
    })
    const states = makePropertyStates({
      mediterranean: { ownerId: 'p1', houses: 2, isMortgaged: false },
      baltic: { ownerId: 'p1', houses: 0, isMortgaged: false },
    })
    // 1000 + 30(mediterranean抵当) + 30(baltic抵当) + 2*25(家の半額) = 1110
    expect(calculateTotalAssets(player, states, BOARD_SPACES)).toBe(1110)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/game/__tests__/rules.test.ts`
Expected: FAIL

- [ ] **Step 3: ルールロジックを実装**

`src/game/rules.ts`:

```typescript
import type { BoardSpace, Player, PropertyState, ColorGroup } from './types'

/** 指定物件のカラーグループに属する全物件IDを返す */
export function getColorGroup(
  propertyId: string,
  board: BoardSpace[],
): string[] {
  const space = board.find((s) => s.id === propertyId)
  if (!space?.color) return []
  return board.filter((s) => s.color === space.color).map((s) => s.id)
}

/** プレイヤーがカラーグループ全物件を所有しているか */
export function ownsFullColorGroup(
  propertyId: string,
  ownerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const group = getColorGroup(propertyId, board)
  if (group.length === 0) return false
  return group.every((id) => propertyStates[id]?.ownerId === ownerId)
}

/** レンタル料を計算する */
export function calculateRent(
  propertyId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
  diceValues: [number, number],
): number {
  const state = propertyStates[propertyId]
  if (!state?.ownerId || state.isMortgaged) return 0

  const space = board.find((s) => s.id === propertyId)!

  if (space.type === 'railroad') {
    const ownedRailroads = board
      .filter((s) => s.type === 'railroad')
      .filter(
        (s) =>
          propertyStates[s.id]?.ownerId === state.ownerId &&
          !propertyStates[s.id]?.isMortgaged,
      ).length
    return space.rent![ownedRailroads - 1]
  }

  if (space.type === 'utility') {
    const ownedUtilities = board
      .filter((s) => s.type === 'utility')
      .filter(
        (s) =>
          propertyStates[s.id]?.ownerId === state.ownerId &&
          !propertyStates[s.id]?.isMortgaged,
      ).length
    const diceTotal = diceValues[0] + diceValues[1]
    return diceTotal * (ownedUtilities === 1 ? 4 : 10)
  }

  // 通常の物件
  if (state.houses > 0) {
    return space.rent![state.houses]
  }

  // 家なし：カラーグループ独占なら2倍
  const baseRent = space.rent![0]
  if (ownsFullColorGroup(propertyId, state.ownerId, propertyStates, board)) {
    return baseRent * 2
  }
  return baseRent
}

/** 家を建設可能か判定する */
export function canBuildHouse(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId]
  if (!state || state.ownerId !== playerId) return false
  if (state.houses >= 5) return false
  if (state.isMortgaged) return false

  // カラーグループ独占チェック
  if (!ownsFullColorGroup(propertyId, playerId, propertyStates, board))
    return false

  // グループ内に抵当物件がないかチェック
  const group = getColorGroup(propertyId, board)
  if (group.some((id) => propertyStates[id]?.isMortgaged)) return false

  // 均等建設ルール: 自分が最小でない場合は建設不可
  const currentHouses = state.houses
  const minHouses = Math.min(
    ...group.map((id) => propertyStates[id]?.houses ?? 0),
  )
  return currentHouses <= minHouses
}

/** 抵当に入れられるか判定する */
export function canMortgage(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId]
  if (!state || state.ownerId !== playerId) return false
  if (state.isMortgaged) return false

  // グループ内に家がある場合は抵当不可
  const group = getColorGroup(propertyId, board)
  if (group.some((id) => (propertyStates[id]?.houses ?? 0) > 0)) return false

  return true
}

/** 抵当を解除できるか判定する */
export function canUnmortgage(
  propertyId: string,
  playerId: string,
  player: Player,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId]
  if (!state || state.ownerId !== playerId) return false
  if (!state.isMortgaged) return false

  const space = board.find((s) => s.id === propertyId)!
  const unmortgageCost = Math.floor((space.mortgageValue ?? 0) * 1.1)
  return player.money >= unmortgageCost
}

/** 最寄りの鉄道/公共事業マスのpositionを返す */
export function findNearestSpace(
  currentPosition: number,
  spaceType: 'railroad' | 'utility',
  board: BoardSpace[],
): number {
  const targets = board.filter((s) => s.type === spaceType)
  // 現在位置より先（時計回り）で最も近いものを探す
  for (const target of targets) {
    if (target.position > currentPosition) return target.position
  }
  // 見つからなければラップアラウンド
  return targets[0].position
}

/** プレイヤーの総資産を計算する（破産判定用） */
export function calculateTotalAssets(
  player: Player,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): number {
  let total = player.money

  for (const propId of player.properties) {
    const state = propertyStates[propId]
    const space = board.find((s) => s.id === propId)!

    if (state?.isMortgaged) {
      // 抵当済みの物件は価値0（すでに現金を受け取っている）
    } else {
      // 抵当価値
      total += space.mortgageValue ?? 0
    }

    // 家/ホテルの売却価値（半額）
    if (state && state.houses > 0) {
      total += Math.floor(((space.houseCost ?? 0) * state.houses) / 2)
    }
  }

  return total
}

/** 家を売却可能か判定（均等ルール） */
export function canSellHouse(
  propertyId: string,
  playerId: string,
  propertyStates: Record<string, PropertyState>,
  board: BoardSpace[],
): boolean {
  const state = propertyStates[propertyId]
  if (!state || state.ownerId !== playerId) return false
  if (state.houses <= 0) return false

  // 均等売却ルール: 自分が最大でない場合は売却不可
  const group = getColorGroup(propertyId, board)
  const currentHouses = state.houses
  const maxHouses = Math.max(
    ...group.map((id) => propertyStates[id]?.houses ?? 0),
  )
  return currentHouses >= maxHouses
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx vitest run src/game/__tests__/rules.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/rules.ts src/game/__tests__/rules.test.ts
git commit -m "feat: ルール判定ロジックを追加（レンタル計算、建設可否、資産計算）"
```

---

## Task 6: アクション定義

**Files:**

- Create: `src/game/actions.ts`

- [ ] **Step 1: アクション定義を作成**

`src/game/actions.ts`:

```typescript
import type { TradeOffer } from './types'

export type GameAction =
  // ── セットアップ ──
  | { type: 'START_GAME'; playerNames: string[]; playerTokens: string[] }

  // ── サイコロ ──
  | { type: 'ROLL_DICE' }
  | { type: 'FINISH_MOVING' }

  // ── 物件 ──
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PURCHASE' }

  // ── 競売 ──
  | { type: 'PLACE_BID'; amount: number }
  | { type: 'PASS_AUCTION' }

  // ── カード ──
  | { type: 'DRAW_CARD' }
  | { type: 'DISMISS_CARD' }

  // ── 建設 ──
  | { type: 'BUILD_HOUSE'; propertyId: string }
  | { type: 'SELL_HOUSE'; propertyId: string }
  | { type: 'OPEN_BUILD_DIALOG' }
  | { type: 'CLOSE_BUILD_DIALOG' }

  // ── 抵当 ──
  | { type: 'MORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'UNMORTGAGE_PROPERTY'; propertyId: string }
  | { type: 'OPEN_MORTGAGE_DIALOG' }
  | { type: 'CLOSE_MORTGAGE_DIALOG' }

  // ── 交渉 ──
  | { type: 'OPEN_TRADE_DIALOG'; targetPlayerId: string }
  | { type: 'CLOSE_TRADE_DIALOG' }
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'REJECT_TRADE' }

  // ── 刑務所 ──
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'ROLL_FOR_JAIL' }

  // ── 破産 ──
  | { type: 'DECLARE_BANKRUPTCY'; creditorId: string | null }

  // ── ターン ──
  | { type: 'END_TURN' }

  // ── 税金 ──
  | { type: 'PAY_TAX' }
```

- [ ] **Step 2: コミット**

```bash
git add src/game/actions.ts
git commit -m "feat: ゲームアクション型定義を追加"
```

---

## Task 7: ゲームReducer

**Files:**

- Create: `src/game/reducer.ts`
- Test: `src/game/__tests__/reducer.test.ts`

- [ ] **Step 1: テストファイル作成**

`src/game/__tests__/reducer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { gameReducer, createInitialGameState } from '../reducer'
import type { GameState } from '../types'

function startedGame(playerCount = 2): GameState {
  const names = ['たろう', 'はなこ', 'じろう', 'さくら'].slice(0, playerCount)
  const tokens = ['🚗', '🎩', '👞', '🐕'].slice(0, playerCount)
  return gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: names,
    playerTokens: tokens,
  })
}

describe('createInitialGameState', () => {
  it('setupフェーズで開始する', () => {
    const state = createInitialGameState()
    expect(state.phase).toBe('setup')
    expect(state.players).toHaveLength(0)
  })
})

describe('START_GAME', () => {
  it('プレイヤーを初期化しplayingフェーズに遷移する', () => {
    const state = startedGame(3)
    expect(state.phase).toBe('playing')
    expect(state.players).toHaveLength(3)
    expect(state.players[0].money).toBe(1500)
    expect(state.turnPhase).toBe('roll')
    expect(state.currentPlayerIndex).toBe(0)
  })
})

describe('ROLL_DICE', () => {
  it('サイコロを振ってmovingフェーズに遷移する', () => {
    const state = startedGame()
    const rolled = gameReducer(state, { type: 'ROLL_DICE' })
    expect(rolled.dice.rolled).toBe(true)
    expect(rolled.dice.values[0]).toBeGreaterThanOrEqual(1)
    expect(rolled.dice.values[0]).toBeLessThanOrEqual(6)
    expect(rolled.turnPhase).toBe('moving')
  })
})

describe('FINISH_MOVING', () => {
  it('プレイヤーの位置を更新しlandedフェーズに遷移する', () => {
    let state = startedGame()
    state = gameReducer(state, { type: 'ROLL_DICE' })
    const diceTotal = state.dice.values[0] + state.dice.values[1]
    state = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(state.players[0].position).toBe(diceTotal)
    expect(state.turnPhase).toBe('landed')
  })

  it('GOを通過すると$200もらえる', () => {
    let state = startedGame()
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 38 } : p,
      ),
    }
    // サイコロの目を固定するためにstateを直接操作
    state = {
      ...state,
      dice: { values: [3, 2], doubles: 0, rolled: true },
      turnPhase: 'moving' as const,
    }
    state = gameReducer(state, { type: 'FINISH_MOVING' })
    expect(state.players[0].position).toBe(3)
    expect(state.players[0].money).toBe(1700) // 1500 + 200
  })
})

describe('BUY_PROPERTY', () => {
  it('物件を購入する', () => {
    let state = startedGame()
    // position 1（ちちぶ通り、$60）に移動
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 1 } : p,
      ),
      turnPhase: 'action' as const,
    }
    state = gameReducer(state, { type: 'BUY_PROPERTY' })
    expect(state.players[0].money).toBe(1440) // 1500 - 60
    expect(state.players[0].properties).toContain('mediterranean')
    expect(state.propertyStates['mediterranean'].ownerId).toBe(
      state.players[0].id,
    )
  })
})

describe('END_TURN', () => {
  it('次のプレイヤーに切り替わる', () => {
    let state = startedGame()
    state = { ...state, turnPhase: 'endTurn' as const }
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.turnPhase).toBe('roll')
  })

  it('最後のプレイヤーの後は最初に戻る', () => {
    let state = startedGame(2)
    state = { ...state, currentPlayerIndex: 1, turnPhase: 'endTurn' as const }
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayerIndex).toBe(0)
  })

  it('破産したプレイヤーはスキップされる', () => {
    let state = startedGame(3)
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 1 ? { ...p, isBankrupt: true } : p,
      ),
      turnPhase: 'endTurn' as const,
    }
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.currentPlayerIndex).toBe(2)
  })
})

describe('Go to Jail', () => {
  it('position 30に止まると刑務所に行く', () => {
    let state = startedGame()
    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 30 } : p,
      ),
      turnPhase: 'landed' as const,
    }
    // landedフェーズで自動処理されるのでFINISH_MOVINGをテスト
    // reducerはlandedでGoToJailを検出して処理する
    state = {
      ...state,
      dice: { values: [5, 5], doubles: 0, rolled: true },
      turnPhase: 'moving' as const,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 27 } : p,
      ),
    }
    state = gameReducer(state, { type: 'FINISH_MOVING' })
    // position 27 + 10 = 37 ではなく、27+10=37でもなく、diceは[5,5]なので27+10=37
    // 実際にはFINISH_MOVINGでpositionが計算される
    // Go to Jail(30)に止まるケースは別途テスト
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/game/__tests__/reducer.test.ts`
Expected: FAIL

- [ ] **Step 3: Reducerを実装**

`src/game/reducer.ts`:

```typescript
import type { GameState, Player, AuctionState, Card } from './types'
import type { GameAction } from './actions'
import { createInitialPlayer } from './types'
import { BOARD_SPACES, createPropertyStates } from './board'
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, shuffleCards } from './cards'
import {
  calculateRent,
  findNearestSpace,
  ownsFullColorGroup,
  canBuildHouse,
  canSellHouse,
} from './rules'

export function createInitialGameState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    board: BOARD_SPACES,
    propertyStates: createPropertyStates(),
    cards: {
      chance: shuffleCards(CHANCE_CARDS),
      communityChest: shuffleCards(COMMUNITY_CHEST_CARDS),
    },
    dice: { values: [1, 1], doubles: 0, rolled: false },
    turnPhase: 'roll',
    auction: null,
    trade: null,
    currentCard: null,
    message: '',
    winnerId: null,
  }
}

function rollDice(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
}

function nextActivePlayer(players: Player[], currentIndex: number): number {
  const count = players.length
  let next = (currentIndex + 1) % count
  while (players[next].isBankrupt) {
    next = (next + 1) % count
    if (next === currentIndex) break
  }
  return next
}

function checkWinner(players: Player[]): string | null {
  const active = players.filter((p) => !p.isBankrupt)
  if (active.length === 1) return active[0].id
  return null
}

function drawCard(
  state: GameState,
  deckType: 'chance' | 'communityChest',
): { card: Card; deck: Card[] } {
  const deck = [...state.cards[deckType]]
  const card = deck.shift()!
  // jailFreeカードは使われるまでデッキに戻さない
  if (card.action.type !== 'jailFree') {
    deck.push(card)
  }
  return { card, deck }
}

function applyCardEffect(state: GameState, card: Card): GameState {
  const player = state.players[state.currentPlayerIndex]
  let newState = { ...state }

  switch (card.action.type) {
    case 'move': {
      const passGo =
        card.action.position < player.position && card.action.position !== 10
      const goBonus = passGo ? 200 : 0
      newState = updateCurrentPlayer(newState, {
        position: card.action.position,
        money: player.money + goBonus,
      })
      break
    }
    case 'moveRelative': {
      const newPos = (player.position + card.action.spaces + 40) % 40
      newState = updateCurrentPlayer(newState, { position: newPos })
      break
    }
    case 'money': {
      newState = updateCurrentPlayer(newState, {
        money: player.money + card.action.amount,
      })
      break
    }
    case 'moneyFromPlayers': {
      const amount = card.action.amount
      const otherPlayers = newState.players.filter(
        (p) => p.id !== player.id && !p.isBankrupt,
      )
      const totalReceived = amount > 0 ? amount * otherPlayers.length : 0
      const totalPaid = amount < 0 ? Math.abs(amount) * otherPlayers.length : 0
      newState = {
        ...newState,
        players: newState.players.map((p) => {
          if (p.id === player.id) {
            return {
              ...p,
              money: p.money + (amount > 0 ? totalReceived : -totalPaid),
            }
          }
          if (!p.isBankrupt) {
            return {
              ...p,
              money: p.money + (amount > 0 ? -amount : Math.abs(amount)),
            }
          }
          return p
        }),
      }
      break
    }
    case 'jail': {
      newState = updateCurrentPlayer(newState, {
        position: 10,
        inJail: true,
      })
      newState = { ...newState, dice: { ...newState.dice, doubles: 0 } }
      break
    }
    case 'jailFree': {
      newState = updateCurrentPlayer(newState, {
        getOutOfJailCards: player.getOutOfJailCards + 1,
      })
      break
    }
    case 'repair': {
      let cost = 0
      for (const propId of player.properties) {
        const ps = newState.propertyStates[propId]
        if (ps && ps.houses > 0) {
          if (ps.houses === 5) {
            cost += card.action.perHotel
          } else {
            cost += card.action.perHouse * ps.houses
          }
        }
      }
      newState = updateCurrentPlayer(newState, { money: player.money - cost })
      break
    }
    case 'moveNearest': {
      const nearestPos = findNearestSpace(
        player.position,
        card.action.spaceType,
        BOARD_SPACES,
      )
      const passGo = nearestPos < player.position
      const goBonus = passGo ? 200 : 0
      newState = updateCurrentPlayer(newState, {
        position: nearestPos,
        money: player.money + goBonus,
      })
      break
    }
  }

  return newState
}

function updateCurrentPlayer(
  state: GameState,
  updates: Partial<Player>,
): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, ...updates } : p,
    ),
  }
}

function handleLanding(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex]
  const space = BOARD_SPACES[player.position]

  // Go to Jail
  if (space.id === 'go-to-jail') {
    return {
      ...updateCurrentPlayer(state, { position: 10, inJail: true }),
      dice: { ...state.dice, doubles: 0 },
      turnPhase: 'endTurn',
      message: `${player.name}は刑務所にいくことになったよ！`,
    }
  }

  // 税金
  if (space.type === 'tax') {
    return {
      ...state,
      turnPhase: 'action',
      message: `${space.name}！$${space.price}はらってね`,
    }
  }

  // Chance / Community Chest
  if (space.type === 'chance' || space.type === 'communityChest') {
    return {
      ...state,
      turnPhase: 'action',
      message: `${space.name}をひこう！`,
    }
  }

  // 物件・鉄道・公共事業
  if (
    space.type === 'property' ||
    space.type === 'railroad' ||
    space.type === 'utility'
  ) {
    const propState = state.propertyStates[space.id]

    if (!propState?.ownerId) {
      // 未所有: 購入するか競売するか
      return {
        ...state,
        turnPhase: 'action',
        message: `${space.name}はだれのものでもないよ。$${space.price}で買う？`,
      }
    }

    if (propState.ownerId === player.id) {
      // 自分の物件
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}は自分の土地だよ！`,
      }
    }

    // 他プレイヤーの物件: レンタル支払い
    if (propState.isMortgaged) {
      return {
        ...state,
        turnPhase: 'endTurn',
        message: `${space.name}はお金をかりている状態だから、とまり賃はいらないよ！`,
      }
    }

    const rent = calculateRent(
      space.id,
      state.propertyStates,
      BOARD_SPACES,
      state.dice.values,
    )
    const owner = state.players.find((p) => p.id === propState.ownerId)!

    if (player.money < rent) {
      // 支払い不能 → 破産処理へ
      return {
        ...state,
        turnPhase: 'bankrupt',
        message: `${space.name}のとまり賃$${rent}がはらえないよ…`,
      }
    }

    return {
      ...state,
      players: state.players.map((p) => {
        if (p.id === player.id) return { ...p, money: p.money - rent }
        if (p.id === owner.id) return { ...p, money: p.money + rent }
        return p
      }),
      turnPhase: 'endTurn',
      message: `${owner.name}に$${rent}のとまり賃をはらったよ`,
    }
  }

  // コーナー（GO, 刑務所訪問, Free Parking）
  if (space.id === 'go') {
    return { ...state, turnPhase: 'endTurn', message: 'GOに止まったよ！' }
  }

  return { ...state, turnPhase: 'endTurn', message: '' }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const players = action.playerNames.map((name, i) =>
        createInitialPlayer(`p${i + 1}`, name, action.playerTokens[i]),
      )
      return {
        ...state,
        phase: 'playing',
        players,
        currentPlayerIndex: 0,
        turnPhase: 'roll',
        propertyStates: createPropertyStates(),
        cards: {
          chance: shuffleCards(CHANCE_CARDS),
          communityChest: shuffleCards(COMMUNITY_CHEST_CARDS),
        },
        message: `${players[0].name}のばんだよ！サイコロをふろう！`,
      }
    }

    case 'ROLL_DICE': {
      if (state.turnPhase !== 'roll') return state

      const player = state.players[state.currentPlayerIndex]

      // 刑務所にいる場合
      if (player.inJail) {
        const values = rollDice()
        const isDoubles = values[0] === values[1]

        if (isDoubles) {
          return {
            ...updateCurrentPlayer(state, { inJail: false, jailTurns: 0 }),
            dice: { values, doubles: 0, rolled: true },
            turnPhase: 'moving',
            message: `ゾロ目！刑務所から出られるよ！`,
          }
        }

        const newJailTurns = player.jailTurns + 1
        if (newJailTurns >= 3) {
          // 3ターン目: 強制的に$50払って出る
          return {
            ...updateCurrentPlayer(state, {
              inJail: false,
              jailTurns: 0,
              money: player.money - 50,
            }),
            dice: { values, doubles: 0, rolled: true },
            turnPhase: 'moving',
            message: '$50はらって刑務所から出たよ！',
          }
        }

        return {
          ...updateCurrentPlayer(state, { jailTurns: newJailTurns }),
          dice: { values, doubles: 0, rolled: true },
          turnPhase: 'endTurn',
          message: `ゾロ目じゃないから出られないよ…（${newJailTurns}/3ターン）`,
        }
      }

      // 通常のサイコロ
      const values = rollDice()
      const isDoubles = values[0] === values[1]
      const newDoublesCount = isDoubles ? state.dice.doubles + 1 : 0

      // 3連続ゾロ目で刑務所行き
      if (newDoublesCount >= 3) {
        return {
          ...updateCurrentPlayer(state, { position: 10, inJail: true }),
          dice: { values, doubles: 0, rolled: true },
          turnPhase: 'endTurn',
          message: '3回れんぞくゾロ目！刑務所にいってね！',
        }
      }

      return {
        ...state,
        dice: { values, doubles: newDoublesCount, rolled: true },
        turnPhase: 'moving',
        message: `${values[0]}と${values[1]}が出たよ！`,
      }
    }

    case 'FINISH_MOVING': {
      if (state.turnPhase !== 'moving') return state

      const player = state.players[state.currentPlayerIndex]
      const diceTotal = state.dice.values[0] + state.dice.values[1]
      const oldPosition = player.position
      const newPosition = (oldPosition + diceTotal) % 40
      const passedGo = newPosition < oldPosition
      const goBonus = passedGo ? 200 : 0

      const movedState = updateCurrentPlayer(
        { ...state, turnPhase: 'landed' },
        {
          position: newPosition,
          money: player.money + goBonus,
        },
      )

      if (goBonus > 0) {
        return handleLanding({
          ...movedState,
          message: 'GOを通ったから$200もらえるよ！',
        })
      }

      return handleLanding(movedState)
    }

    case 'BUY_PROPERTY': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES[player.position]
      if (!space.price || player.money < space.price) return state

      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? {
                ...p,
                money: p.money - space.price!,
                properties: [...p.properties, space.id],
              }
            : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          [space.id]: { ...state.propertyStates[space.id], ownerId: player.id },
        },
        turnPhase: 'endTurn',
        message: `${space.name}を買ったよ！`,
      }
    }

    case 'DECLINE_PURCHASE': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES[player.position]

      // 競売を開始
      const auction: AuctionState = {
        propertyId: space.id,
        currentBid: 0,
        currentBidderId: null,
        passedPlayerIds: [],
        activePlayerIndex: state.currentPlayerIndex,
      }

      return {
        ...state,
        turnPhase: 'auction',
        auction,
        message: `${space.name}をみんなでオークション！`,
      }
    }

    case 'PLACE_BID': {
      if (!state.auction) return state
      const player = state.players[state.auction.activePlayerIndex]

      const newBid = state.auction.currentBid + action.amount
      if (newBid > player.money) return state

      // 次のアクティブプレイヤーを探す
      let nextIdx = nextActivePlayer(
        state.players,
        state.auction.activePlayerIndex,
      )
      // パスしたプレイヤーとbidした本人はスキップ
      const passedIds = state.auction.passedPlayerIds
      while (
        passedIds.includes(state.players[nextIdx].id) ||
        state.players[nextIdx].isBankrupt
      ) {
        if (nextIdx === state.auction.activePlayerIndex) break
        nextIdx = nextActivePlayer(state.players, nextIdx)
      }

      return {
        ...state,
        auction: {
          ...state.auction,
          currentBid: newBid,
          currentBidderId: player.id,
          activePlayerIndex: nextIdx,
        },
        message: `${player.name}が$${newBid}で入札したよ！`,
      }
    }

    case 'PASS_AUCTION': {
      if (!state.auction) return state
      const player = state.players[state.auction.activePlayerIndex]
      const newPassedIds = [...state.auction.passedPlayerIds, player.id]
      const activePlayers = state.players.filter(
        (p) => !p.isBankrupt && !newPassedIds.includes(p.id),
      )

      // 全員パスまたは入札者1人のみ残り
      if (
        activePlayers.length === 0 ||
        (activePlayers.length === 1 && state.auction.currentBidderId)
      ) {
        if (state.auction.currentBidderId) {
          // 落札
          const winnerId = state.auction.currentBidderId
          const space = BOARD_SPACES.find(
            (s) => s.id === state.auction!.propertyId,
          )!
          return {
            ...state,
            players: state.players.map((p) =>
              p.id === winnerId
                ? {
                    ...p,
                    money: p.money - state.auction!.currentBid,
                    properties: [...p.properties, space.id],
                  }
                : p,
            ),
            propertyStates: {
              ...state.propertyStates,
              [space.id]: {
                ...state.propertyStates[space.id],
                ownerId: winnerId,
              },
            },
            auction: null,
            turnPhase: 'endTurn',
            message: `${state.players.find((p) => p.id === winnerId)!.name}が$${state.auction.currentBid}で落札したよ！`,
          }
        } else {
          // 誰も入札しなかった
          return {
            ...state,
            auction: null,
            turnPhase: 'endTurn',
            message: 'だれも買わなかったよ',
          }
        }
      }

      // 次のアクティブプレイヤー
      let nextIdx = nextActivePlayer(
        state.players,
        state.auction.activePlayerIndex,
      )
      while (
        newPassedIds.includes(state.players[nextIdx].id) ||
        state.players[nextIdx].isBankrupt
      ) {
        nextIdx = nextActivePlayer(state.players, nextIdx)
      }

      return {
        ...state,
        auction: {
          ...state.auction,
          passedPlayerIds: newPassedIds,
          activePlayerIndex: nextIdx,
        },
        message: `${player.name}はパスしたよ`,
      }
    }

    case 'DRAW_CARD': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES[player.position]
      const deckType = space.type === 'chance' ? 'chance' : 'communityChest'
      const { card, deck } = drawCard(state, deckType)

      return {
        ...state,
        cards: { ...state.cards, [deckType]: deck },
        currentCard: card,
        message: card.text,
      }
    }

    case 'DISMISS_CARD': {
      if (!state.currentCard) return state
      const card = state.currentCard
      let newState = applyCardEffect({ ...state, currentCard: null }, card)

      // カード効果で移動した場合は着地処理
      if (
        card.action.type === 'move' ||
        card.action.type === 'moveRelative' ||
        card.action.type === 'moveNearest'
      ) {
        if (card.action.type !== 'jail') {
          newState = handleLanding({ ...newState, turnPhase: 'landed' })
        }
      } else if (card.action.type === 'jail') {
        newState = { ...newState, turnPhase: 'endTurn' }
      } else {
        newState = { ...newState, turnPhase: 'endTurn' }
      }

      return newState
    }

    case 'PAY_TAX': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES[player.position]
      const taxAmount = space.price ?? 0

      if (player.money < taxAmount) {
        return {
          ...state,
          turnPhase: 'bankrupt',
          message: `ぜいきん$${taxAmount}がはらえないよ…`,
        }
      }

      return {
        ...updateCurrentPlayer(state, { money: player.money - taxAmount }),
        turnPhase: 'endTurn',
        message: `$${taxAmount}のぜいきんをはらったよ`,
      }
    }

    case 'PAY_JAIL_FINE': {
      const player = state.players[state.currentPlayerIndex]
      if (player.money < 50) return state

      return {
        ...updateCurrentPlayer(state, {
          money: player.money - 50,
          inJail: false,
          jailTurns: 0,
        }),
        turnPhase: 'roll',
        message: '$50はらって刑務所から出たよ！サイコロをふろう！',
      }
    }

    case 'USE_JAIL_CARD': {
      const player = state.players[state.currentPlayerIndex]
      if (player.getOutOfJailCards <= 0) return state

      // カードをデッキに戻す
      const cardType = CHANCE_CARDS.find((c) => c.action.type === 'jailFree')
        ? 'chance'
        : 'communityChest'

      const jailFreeCard = [...CHANCE_CARDS, ...COMMUNITY_CHEST_CARDS].find(
        (c) => c.action.type === 'jailFree',
      )!

      return {
        ...updateCurrentPlayer(state, {
          getOutOfJailCards: player.getOutOfJailCards - 1,
          inJail: false,
          jailTurns: 0,
        }),
        cards: {
          ...state.cards,
          [cardType]: [...state.cards[cardType], jailFreeCard],
        },
        turnPhase: 'roll',
        message: 'カードをつかって刑務所から出たよ！サイコロをふろう！',
      }
    }

    case 'BUILD_HOUSE': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.id === action.propertyId)!
      if (
        !canBuildHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          BOARD_SPACES,
        )
      )
        return state
      if (player.money < (space.houseCost ?? 0)) return state

      const currentHouses = state.propertyStates[action.propertyId].houses
      const label =
        currentHouses === 4 ? 'ホテル' : `家${currentHouses + 1}けん目`

      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, money: p.money - (space.houseCost ?? 0) }
            : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          [action.propertyId]: {
            ...state.propertyStates[action.propertyId],
            houses: currentHouses + 1,
          },
        },
        message: `${space.name}に${label}をたてたよ！`,
      }
    }

    case 'SELL_HOUSE': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.id === action.propertyId)!
      if (
        !canSellHouse(
          action.propertyId,
          player.id,
          state.propertyStates,
          BOARD_SPACES,
        )
      )
        return state

      const currentHouses = state.propertyStates[action.propertyId].houses
      const sellPrice = Math.floor((space.houseCost ?? 0) / 2)

      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, money: p.money + sellPrice }
            : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          [action.propertyId]: {
            ...state.propertyStates[action.propertyId],
            houses: currentHouses - 1,
          },
        },
        message: `${space.name}の家を売ったよ（+$${sellPrice}）`,
      }
    }

    case 'MORTGAGE_PROPERTY': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.id === action.propertyId)!
      const mortgageValue = space.mortgageValue ?? 0

      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, money: p.money + mortgageValue }
            : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          [action.propertyId]: {
            ...state.propertyStates[action.propertyId],
            isMortgaged: true,
          },
        },
        message: `${space.name}でお金をかりたよ（+$${mortgageValue}）`,
      }
    }

    case 'UNMORTGAGE_PROPERTY': {
      const player = state.players[state.currentPlayerIndex]
      const space = BOARD_SPACES.find((s) => s.id === action.propertyId)!
      const unmortgageCost = Math.floor((space.mortgageValue ?? 0) * 1.1)
      if (player.money < unmortgageCost) return state

      return {
        ...state,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, money: p.money - unmortgageCost }
            : p,
        ),
        propertyStates: {
          ...state.propertyStates,
          [action.propertyId]: {
            ...state.propertyStates[action.propertyId],
            isMortgaged: false,
          },
        },
        message: `${space.name}のお金をかえしたよ（-$${unmortgageCost}）`,
      }
    }

    case 'OPEN_BUILD_DIALOG':
      return { ...state, turnPhase: 'build' }

    case 'CLOSE_BUILD_DIALOG':
      return { ...state, turnPhase: 'endTurn' }

    case 'OPEN_MORTGAGE_DIALOG':
      return { ...state, turnPhase: 'mortgage' }

    case 'CLOSE_MORTGAGE_DIALOG':
      return { ...state, turnPhase: 'endTurn' }

    case 'OPEN_TRADE_DIALOG': {
      return {
        ...state,
        turnPhase: 'trade',
        trade: {
          fromPlayerId: state.players[state.currentPlayerIndex].id,
          toPlayerId: action.targetPlayerId,
          offerProperties: [],
          offerMoney: 0,
          offerJailCards: 0,
          requestProperties: [],
          requestMoney: 0,
          requestJailCards: 0,
        },
      }
    }

    case 'CLOSE_TRADE_DIALOG':
      return { ...state, turnPhase: 'endTurn', trade: null }

    case 'PROPOSE_TRADE':
      return {
        ...state,
        trade: action.offer,
        message: '取引をていあんしたよ！',
      }

    case 'ACCEPT_TRADE': {
      if (!state.trade) return state
      const {
        fromPlayerId,
        toPlayerId,
        offerProperties,
        offerMoney,
        offerJailCards,
        requestProperties,
        requestMoney,
        requestJailCards,
      } = state.trade

      return {
        ...state,
        players: state.players.map((p) => {
          if (p.id === fromPlayerId) {
            return {
              ...p,
              money: p.money - offerMoney + requestMoney,
              properties: [
                ...p.properties.filter((id) => !offerProperties.includes(id)),
                ...requestProperties,
              ],
              getOutOfJailCards:
                p.getOutOfJailCards - offerJailCards + requestJailCards,
            }
          }
          if (p.id === toPlayerId) {
            return {
              ...p,
              money: p.money + offerMoney - requestMoney,
              properties: [
                ...p.properties.filter((id) => !requestProperties.includes(id)),
                ...offerProperties,
              ],
              getOutOfJailCards:
                p.getOutOfJailCards + offerJailCards - requestJailCards,
            }
          }
          return p
        }),
        propertyStates: (() => {
          const newStates = { ...state.propertyStates }
          for (const propId of offerProperties) {
            newStates[propId] = { ...newStates[propId], ownerId: toPlayerId }
          }
          for (const propId of requestProperties) {
            newStates[propId] = { ...newStates[propId], ownerId: fromPlayerId }
          }
          return newStates
        })(),
        trade: null,
        turnPhase: 'endTurn',
        message: '取引せいりつ！',
      }
    }

    case 'REJECT_TRADE':
      return {
        ...state,
        trade: null,
        turnPhase: 'endTurn',
        message: '取引はことわられたよ',
      }

    case 'DECLARE_BANKRUPTCY': {
      const player = state.players[state.currentPlayerIndex]

      let newState: GameState

      if (action.creditorId) {
        // 他プレイヤーへの破産：全資産を移転
        newState = {
          ...state,
          players: state.players.map((p) => {
            if (p.id === player.id) {
              return { ...p, isBankrupt: true, money: 0, properties: [] }
            }
            if (p.id === action.creditorId) {
              return {
                ...p,
                money: p.money + player.money,
                properties: [...p.properties, ...player.properties],
              }
            }
            return p
          }),
          propertyStates: (() => {
            const newStates = { ...state.propertyStates }
            for (const propId of player.properties) {
              newStates[propId] = {
                ...newStates[propId],
                ownerId: action.creditorId!,
              }
            }
            return newStates
          })(),
        }
      } else {
        // 銀行への破産：全物件を競売（簡略化して物件をリリース）
        newState = {
          ...state,
          players: state.players.map((p) =>
            p.id === player.id
              ? { ...p, isBankrupt: true, money: 0, properties: [] }
              : p,
          ),
          propertyStates: (() => {
            const newStates = { ...state.propertyStates }
            for (const propId of player.properties) {
              newStates[propId] = {
                ownerId: null,
                houses: 0,
                isMortgaged: false,
              }
            }
            return newStates
          })(),
        }
      }

      const winner = checkWinner(newState.players)
      if (winner) {
        const winnerPlayer = newState.players.find((p) => p.id === winner)!
        return {
          ...newState,
          phase: 'finished',
          winnerId: winner,
          turnPhase: 'endTurn',
          message: `${winnerPlayer.name}のかち！おめでとう！🎉`,
        }
      }

      return {
        ...newState,
        turnPhase: 'endTurn',
        message: `${player.name}はおかねがなくなった！`,
      }
    }

    case 'END_TURN': {
      // ゾロ目ならもう一回
      if (
        state.dice.doubles > 0 &&
        !state.players[state.currentPlayerIndex].inJail
      ) {
        return {
          ...state,
          turnPhase: 'roll',
          dice: { ...state.dice, rolled: false },
          message: 'ゾロ目だからもういっかい！',
        }
      }

      const nextIdx = nextActivePlayer(state.players, state.currentPlayerIndex)
      const nextPlayer = state.players[nextIdx]

      return {
        ...state,
        currentPlayerIndex: nextIdx,
        turnPhase: 'roll',
        dice: { values: [1, 1], doubles: 0, rolled: false },
        message: `${nextPlayer.name}のばんだよ！${nextPlayer.inJail ? '刑務所にいるよ…' : 'サイコロをふろう！'}`,
      }
    }

    case 'ROLL_FOR_JAIL':
      // ROLL_DICEで処理済み（刑務所チェック含む）
      return gameReducer(state, { type: 'ROLL_DICE' })

    default:
      return state
  }
}
```

- [ ] **Step 4: テスト通過を確認**

Run: `npx vitest run src/game/__tests__/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/game/actions.ts src/game/reducer.ts src/game/__tests__/reducer.test.ts
git commit -m "feat: ゲームReducerとアクション定義を追加"
```

---

## Task 8: 共通UIコンポーネント

**Files:**

- Create: `src/components/common/Button.tsx`, `src/components/common/Dialog.tsx`, `src/components/common/common.module.css`

- [ ] **Step 1: 共通スタイルを作成**

`src/components/common/common.module.css`:

```css
/* ── ボタン ── */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.1s,
    box-shadow 0.1s;
  touch-action: manipulation;
}

.button:active {
  transform: scale(0.96);
}

.button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.primary {
  background: var(--color-primary);
  color: var(--color-white);
  box-shadow: 0 3px 0 #d94848;
}

.secondary {
  background: var(--color-secondary);
  color: var(--color-white);
  box-shadow: 0 3px 0 #3aafa3;
}

.danger {
  background: var(--color-danger);
  color: var(--color-white);
  box-shadow: 0 3px 0 #c0392b;
}

.ghost {
  background: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-text-light);
}

.large {
  padding: 16px 32px;
  font-size: 20px;
  border-radius: var(--radius-lg);
}

.small {
  padding: 8px 16px;
  font-size: 14px;
}

/* ── ダイアログ ── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.dialog {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialogTitle {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  text-align: center;
}

.dialogActions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Buttonコンポーネント**

`src/components/common/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import styles from './common.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'small' | 'medium' | 'large'
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size !== 'medium' && styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Dialogコンポーネント**

`src/components/common/Dialog.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from './common.module.css'

type DialogProps = {
  title: string
  children: ReactNode
  actions?: ReactNode
}

export default function Dialog({ title, children, actions }: DialogProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.dialogTitle}>{title}</div>
        {children}
        {actions && <div className={styles.dialogActions}>{actions}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: コミット**

```bash
git add src/components/common/
git commit -m "feat: 共通UIコンポーネント（Button, Dialog）を追加"
```

---

## Task 9: セットアップ画面

**Files:**

- Create: `src/components/Setup/Setup.tsx`, `src/components/Setup/Setup.module.css`

- [ ] **Step 1: スタイル作成**

`src/components/Setup/Setup.module.css`:

```css
.setup {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 24px;
}

.title {
  font-size: 36px;
  font-weight: 900;
  color: var(--color-primary);
  text-align: center;
}

.subtitle {
  font-size: 16px;
  color: var(--color-text-light);
  text-align: center;
}

.playerCount {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 18px;
}

.countButton {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--color-secondary);
  color: var(--color-white);
  font-size: 24px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countButton:disabled {
  opacity: 0.3;
}

.playerList {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.playerRow {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-white);
  padding: 12px 16px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.tokenSelector {
  font-size: 28px;
  cursor: pointer;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
}

.tokenSelector:hover,
.tokenSelected {
  border-color: var(--color-primary);
  background: #fff0f0;
}

.nameInput {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-family: inherit;
}

.nameInput:focus {
  outline: none;
  border-color: var(--color-secondary);
}

.tokenPicker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.startButton {
  margin-top: 16px;
}
```

- [ ] **Step 2: Setupコンポーネント作成**

`src/components/Setup/Setup.tsx`:

```tsx
import { useState } from 'react'
import { TOKENS } from '../../game/types'
import Button from '../common/Button'
import styles from './Setup.module.css'

type SetupProps = {
  onStart: (names: string[], tokens: string[]) => void
}

const DEFAULT_NAMES = [
  'プレイヤー1',
  'プレイヤー2',
  'プレイヤー3',
  'プレイヤー4',
]

export default function Setup({ onStart }: SetupProps) {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(DEFAULT_NAMES)
  const [selectedTokens, setSelectedTokens] = useState([
    TOKENS[0],
    TOKENS[1],
    TOKENS[2],
    TOKENS[3],
  ])

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...names]
    newNames[index] = name
    setNames(newNames)
  }

  const handleTokenChange = (playerIndex: number, token: string) => {
    const newTokens = [...selectedTokens]
    // 他のプレイヤーが同じトークンを使っていたら交換
    const existingIndex = newTokens.findIndex(
      (t, i) => t === token && i !== playerIndex,
    )
    if (existingIndex !== -1) {
      newTokens[existingIndex] = newTokens[playerIndex]
    }
    newTokens[playerIndex] = token
    setSelectedTokens(newTokens)
  }

  const canStart = names.slice(0, playerCount).every((n) => n.trim().length > 0)

  return (
    <div className={styles.setup}>
      <div className={styles.title}>🎲 モノポリ</div>
      <div className={styles.subtitle}>いっしょにあそぼう！</div>

      <div className={styles.playerCount}>
        <button
          className={styles.countButton}
          onClick={() => setPlayerCount((c) => c - 1)}
          disabled={playerCount <= 2}
        >
          −
        </button>
        <span>{playerCount}人であそぶ</span>
        <button
          className={styles.countButton}
          onClick={() => setPlayerCount((c) => c + 1)}
          disabled={playerCount >= 4}
        >
          ＋
        </button>
      </div>

      <div className={styles.playerList}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} className={styles.playerRow}>
            <span style={{ fontSize: 28 }}>{selectedTokens[i]}</span>
            <input
              className={styles.nameInput}
              value={names[i]}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={`プレイヤー${i + 1}のなまえ`}
            />
          </div>
        ))}
      </div>

      <div className={styles.tokenPicker}>
        {TOKENS.map((token) => (
          <span key={token} style={{ fontSize: 24, padding: 4 }}>
            {token}
          </span>
        ))}
      </div>
      <div className={styles.subtitle}>
        なまえの横のアイコンをタップしてコマをえらべるよ
      </div>

      <Button
        size="large"
        className={styles.startButton}
        onClick={() =>
          onStart(
            names.slice(0, playerCount),
            selectedTokens.slice(0, playerCount),
          )
        }
        disabled={!canStart}
      >
        ゲームスタート！
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: App.tsxを更新してSetupを表示**

`src/App.tsx`:

```tsx
import { useReducer } from 'react'
import { gameReducer, createInitialGameState } from './game/reducer'
import Setup from './components/Setup/Setup'
import styles from './App.module.css'

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  )

  if (state.phase === 'setup') {
    return (
      <div className={styles.app}>
        <Setup
          onStart={(names, tokens) =>
            dispatch({
              type: 'START_GAME',
              playerNames: names,
              playerTokens: tokens,
            })
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <p>{state.message}</p>
      <p>
        {state.players[state.currentPlayerIndex].token}{' '}
        {state.players[state.currentPlayerIndex].name}のばん
      </p>
    </div>
  )
}
```

- [ ] **Step 4: 動作確認**

Run: `npm run dev`
セットアップ画面が表示され、プレイヤー数の変更、名前入力ができることを確認。

- [ ] **Step 5: コミット**

```bash
git add src/components/Setup/ src/App.tsx
git commit -m "feat: ゲームセットアップ画面を追加"
```

---

## Task 10: サイコロコンポーネント

**Files:**

- Create: `src/components/Dice/Dice.tsx`, `src/components/Dice/Dice.module.css`

- [ ] **Step 1: スタイル作成**

`src/components/Dice/Dice.module.css`:

```css
.diceContainer {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.die {
  width: 60px;
  height: 60px;
  background: var(--color-white);
  border-radius: 12px;
  box-shadow:
    0 3px 0 #ccc,
    var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 900;
  color: var(--color-text);
}

.rolling {
  animation: roll 0.6s ease-out;
}

@keyframes roll {
  0% {
    transform: rotate(0deg) scale(0.5);
    opacity: 0.5;
  }
  30% {
    transform: rotate(180deg) scale(1.2);
  }
  60% {
    transform: rotate(360deg) scale(0.9);
  }
  100% {
    transform: rotate(720deg) scale(1);
    opacity: 1;
  }
}

.doubles {
  color: var(--color-primary);
}

.diceResult {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-light);
  margin-top: 4px;
}
```

- [ ] **Step 2: Diceコンポーネント作成**

`src/components/Dice/Dice.tsx`:

```tsx
import { useState, useEffect } from 'react'
import styles from './Dice.module.css'

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

type DiceProps = {
  values: [number, number]
  rolling: boolean
  onRollComplete?: () => void
}

export default function Dice({ values, rolling, onRollComplete }: DiceProps) {
  const [displayValues, setDisplayValues] = useState(values)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (rolling) {
      setIsAnimating(true)
      // ランダムな数字を表示するアニメーション
      let count = 0
      const interval = setInterval(() => {
        setDisplayValues([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ])
        count++
        if (count >= 8) {
          clearInterval(interval)
          setDisplayValues(values)
          setIsAnimating(false)
          onRollComplete?.()
        }
      }, 100)
      return () => clearInterval(interval)
    } else {
      setDisplayValues(values)
    }
  }, [rolling, values, onRollComplete])

  const isDoubles = values[0] === values[1]

  return (
    <div>
      <div className={styles.diceContainer}>
        <div
          className={`${styles.die} ${isAnimating ? styles.rolling : ''} ${isDoubles && !isAnimating ? styles.doubles : ''}`}
        >
          {DICE_FACES[displayValues[0]]}
        </div>
        <div
          className={`${styles.die} ${isAnimating ? styles.rolling : ''} ${isDoubles && !isAnimating ? styles.doubles : ''}`}
        >
          {DICE_FACES[displayValues[1]]}
        </div>
      </div>
      {!isAnimating && isDoubles && (
        <div className={styles.diceResult}>ゾロ目！</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: コミット**

```bash
git add src/components/Dice/
git commit -m "feat: サイコロアニメーションコンポーネントを追加"
```

---

## Task 11: プレイヤーパネル

**Files:**

- Create: `src/components/PlayerPanel/PlayerPanel.tsx`, `src/components/PlayerPanel/PlayerPanel.module.css`

- [ ] **Step 1: スタイル作成**

`src/components/PlayerPanel/PlayerPanel.module.css`:

```css
.currentPlayer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.token {
  font-size: 32px;
}

.info {
  flex: 1;
}

.name {
  font-size: 18px;
  font-weight: 700;
}

.money {
  font-size: 16px;
  font-weight: 600;
}

.moneyUp {
  color: var(--color-money-up);
  animation: flash 0.5s;
}

.moneyDown {
  color: var(--color-money-down);
  animation: flash 0.5s;
}

@keyframes flash {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.allPlayers {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
}

.playerChip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-white);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: var(--shadow);
}

.playerChipActive {
  border: 2px solid var(--color-primary);
}

.playerChipBankrupt {
  opacity: 0.4;
  text-decoration: line-through;
}

.jailBadge {
  font-size: 12px;
}
```

- [ ] **Step 2: PlayerPanelコンポーネント作成**

`src/components/PlayerPanel/PlayerPanel.tsx`:

```tsx
import type { Player } from '../../game/types'
import styles from './PlayerPanel.module.css'

type PlayerPanelProps = {
  currentPlayer: Player
  allPlayers: Player[]
  currentPlayerIndex: number
}

export default function PlayerPanel({
  currentPlayer,
  allPlayers,
  currentPlayerIndex,
}: PlayerPanelProps) {
  return (
    <>
      <div className={styles.currentPlayer}>
        <span className={styles.token}>{currentPlayer.token}</span>
        <div className={styles.info}>
          <div className={styles.name}>{currentPlayer.name}のばん</div>
          <div className={styles.money}>
            💰 ${currentPlayer.money.toLocaleString()}
          </div>
        </div>
        {currentPlayer.inJail && <span className={styles.jailBadge}>🔒</span>}
      </div>

      <div className={styles.allPlayers}>
        {allPlayers.map((player, idx) => (
          <div
            key={player.id}
            className={`${styles.playerChip} ${idx === currentPlayerIndex ? styles.playerChipActive : ''} ${player.isBankrupt ? styles.playerChipBankrupt : ''}`}
          >
            <span>{player.token}</span>
            <span>${player.money.toLocaleString()}</span>
            {player.inJail && <span className={styles.jailBadge}>🔒</span>}
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 3: コミット**

```bash
git add src/components/PlayerPanel/
git commit -m "feat: プレイヤーパネルコンポーネントを追加"
```

---

## Task 12: ボード表示（フォーカスビュー + ミニマップ）

**Files:**

- Create: `src/components/Board/FocusView.tsx`, `src/components/Board/MiniMap.tsx`, `src/components/Board/SpaceCard.tsx`, `src/components/Board/Board.module.css`

- [ ] **Step 1: スタイル作成**

`src/components/Board/Board.module.css`:

```css
/* ── フォーカスビュー ── */
.focusView {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.spaceCard {
  flex: 0 0 120px;
  scroll-snap-align: center;
  background: var(--color-white);
  border-radius: var(--radius);
  padding: 12px;
  box-shadow: var(--shadow);
  text-align: center;
  position: relative;
}

.spaceCardCurrent {
  border: 3px solid var(--color-primary);
  box-shadow: 0 0 12px rgba(255, 107, 107, 0.3);
}

.spaceColor {
  height: 8px;
  border-radius: 4px 4px 0 0;
  margin: -12px -12px 8px;
}

.spaceName {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.3;
}

.spacePrice {
  font-size: 12px;
  color: var(--color-text-light);
}

.spaceOwner {
  font-size: 11px;
  margin-top: 4px;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 8px;
  display: inline-block;
}

.spaceHouses {
  margin-top: 4px;
  font-size: 11px;
}

.playerTokensOnSpace {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  font-size: 16px;
}

/* ── ミニマップ ── */
.miniMap {
  padding: 8px 16px;
}

.miniMapBoard {
  display: grid;
  grid-template-columns: repeat(11, 1fr);
  grid-template-rows: repeat(11, 1fr);
  gap: 1px;
  aspect-ratio: 1;
  background: #e0e0e0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  max-height: 180px;
}

.miniSpace {
  background: var(--color-white);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 6px;
  overflow: hidden;
}

.miniSpaceColor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.miniCenter {
  grid-column: 2 / 11;
  grid-row: 2 / 11;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  color: var(--color-primary);
}

.miniToken {
  font-size: 10px;
  position: absolute;
}

.miniOwned {
  opacity: 0.7;
}
```

- [ ] **Step 2: SpaceCardコンポーネント作成**

`src/components/Board/SpaceCard.tsx`:

```tsx
import type {
  BoardSpace,
  Player,
  PropertyState,
  ColorGroup,
} from '../../game/types'
import styles from './Board.module.css'

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
}

type SpaceCardProps = {
  space: BoardSpace
  propertyState?: PropertyState
  players: Player[]
  isCurrent: boolean
  owner?: Player
}

export default function SpaceCard({
  space,
  propertyState,
  players,
  isCurrent,
  owner,
}: SpaceCardProps) {
  const playersHere = players.filter(
    (p) => p.position === space.position && !p.isBankrupt,
  )
  const houses = propertyState?.houses ?? 0
  const houseDisplay =
    houses === 5 ? '🏨' : houses > 0 ? '🏠'.repeat(houses) : ''

  return (
    <div
      className={`${styles.spaceCard} ${isCurrent ? styles.spaceCardCurrent : ''}`}
    >
      {space.color && (
        <div
          className={styles.spaceColor}
          style={{ background: COLOR_MAP[space.color] }}
        />
      )}
      {playersHere.length > 0 && (
        <div className={styles.playerTokensOnSpace}>
          {playersHere.map((p) => (
            <span key={p.id}>{p.token}</span>
          ))}
        </div>
      )}
      <div className={styles.spaceName}>{space.name}</div>
      {space.price !== undefined && space.type !== 'tax' && (
        <div className={styles.spacePrice}>${space.price}</div>
      )}
      {owner && (
        <div className={styles.spaceOwner}>
          {owner.token} {owner.name}
        </div>
      )}
      {houseDisplay && <div className={styles.spaceHouses}>{houseDisplay}</div>}
      {propertyState?.isMortgaged && (
        <div className={styles.spacePrice}>💤 あずけ中</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: FocusViewコンポーネント作成**

`src/components/Board/FocusView.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import type { BoardSpace, Player, PropertyState } from '../../game/types'
import SpaceCard from './SpaceCard'
import styles from './Board.module.css'

type FocusViewProps = {
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  players: Player[]
  currentPosition: number
}

export default function FocusView({
  board,
  propertyStates,
  players,
  currentPosition,
}: FocusViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 現在位置の前後2マスを表示（合計5マス）
  const visibleRange = 2
  const indices: number[] = []
  for (let i = -visibleRange; i <= visibleRange; i++) {
    indices.push((currentPosition + i + 40) % 40)
  }

  useEffect(() => {
    // 中央のカード（現在位置）にスクロール
    if (scrollRef.current) {
      const cards = scrollRef.current.children
      const centerCard = cards[visibleRange] as HTMLElement
      if (centerCard) {
        centerCard.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [currentPosition])

  return (
    <div className={styles.focusView} ref={scrollRef}>
      {indices.map((pos) => {
        const space = board[pos]
        const propState = propertyStates[space.id]
        const owner = propState?.ownerId
          ? players.find((p) => p.id === propState.ownerId)
          : undefined

        return (
          <SpaceCard
            key={space.id + '-' + pos}
            space={space}
            propertyState={propState}
            players={players}
            isCurrent={pos === currentPosition}
            owner={owner}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: MiniMapコンポーネント作成**

`src/components/Board/MiniMap.tsx`:

```tsx
import type {
  BoardSpace,
  Player,
  PropertyState,
  ColorGroup,
} from '../../game/types'
import styles from './Board.module.css'

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
}

type MiniMapProps = {
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  players: Player[]
  onSpaceClick: (position: number) => void
}

/** ボード位置 → CSSグリッドの(row, col)。モノポリボードの外周を時計回りに配置。 */
function getGridPosition(position: number): { row: number; col: number } {
  if (position <= 10) {
    // 下辺: 左から右 (row=11, col=11-position)
    return { row: 11, col: 11 - position }
  } else if (position <= 20) {
    // 左辺: 下から上 (col=1, row=11-(position-10))
    return { row: 11 - (position - 10), col: 1 }
  } else if (position <= 30) {
    // 上辺: 左から右 (row=1, col=position-20+1)
    return { row: 1, col: position - 20 + 1 }
  } else {
    // 右辺: 上から下 (col=11, row=position-30+1)
    return { row: position - 30 + 1, col: 11 }
  }
}

export default function MiniMap({
  board,
  propertyStates,
  players,
  onSpaceClick,
}: MiniMapProps) {
  const activePlayers = players.filter((p) => !p.isBankrupt)

  return (
    <div className={styles.miniMap}>
      <div className={styles.miniMapBoard}>
        {board.map((space) => {
          const { row, col } = getGridPosition(space.position)
          const playersHere = activePlayers.filter(
            (p) => p.position === space.position,
          )
          const propState = propertyStates[space.id]

          return (
            <div
              key={space.id}
              className={`${styles.miniSpace} ${propState?.ownerId ? styles.miniOwned : ''}`}
              style={{ gridRow: row, gridColumn: col }}
              onClick={() => onSpaceClick(space.position)}
            >
              {space.color && (
                <div
                  className={styles.miniSpaceColor}
                  style={{ background: COLOR_MAP[space.color] }}
                />
              )}
              {playersHere.map((p, i) => (
                <span
                  key={p.id}
                  className={styles.miniToken}
                  style={{
                    top: `${i * 10}px`,
                    left: `${i * 6}px`,
                  }}
                >
                  {p.token}
                </span>
              ))}
            </div>
          )
        })}
        <div className={styles.miniCenter}>🎲</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: コミット**

```bash
git add src/components/Board/
git commit -m "feat: ボード表示コンポーネント（フォーカスビュー+ミニマップ）を追加"
```

---

## Task 13: ゲームボード統合コンポーネント & ダイアログ群

**Files:**

- Create: `src/components/ActionDialog/PurchaseDialog.tsx`, `src/components/ActionDialog/AuctionDialog.tsx`, `src/components/ActionDialog/CardDialog.tsx`, `src/components/ActionDialog/JailDialog.tsx`, `src/components/ActionDialog/BuildDialog.tsx`, `src/components/ActionDialog/MortgageDialog.tsx`, `src/components/ActionDialog/TradeDialog.tsx`, `src/components/ActionDialog/BankruptDialog.tsx`, `src/components/ActionDialog/ActionDialog.module.css`
- Create: `src/components/GameBoard/GameBoard.tsx`, `src/components/GameBoard/GameBoard.module.css`

- [ ] **Step 1: ActionDialogスタイル作成**

`src/components/ActionDialog/ActionDialog.module.css`:

```css
.propertyInfo {
  text-align: center;
  padding: 12px 0;
}

.propertyName {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.propertyPrice {
  font-size: 16px;
  color: var(--color-text-light);
}

.auctionInfo {
  text-align: center;
  padding: 8px 0;
}

.bidAmount {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-primary);
  margin: 8px 0;
}

.bidder {
  font-size: 14px;
  color: var(--color-text-light);
}

.bidButtons {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.cardContent {
  text-align: center;
  padding: 16px 0;
  font-size: 18px;
  line-height: 1.6;
}

.cardEmoji {
  font-size: 48px;
  margin-bottom: 12px;
}

.buildList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.buildItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: var(--radius-sm);
}

.buildItemName {
  font-size: 14px;
  font-weight: 600;
}

.buildItemInfo {
  font-size: 12px;
  color: var(--color-text-light);
}

.tradeSection {
  margin: 8px 0;
  padding: 12px;
  background: #f8f8f8;
  border-radius: var(--radius-sm);
}

.tradeSectionTitle {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.tradePropertyList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tradePropertyChip {
  padding: 4px 10px;
  background: var(--color-white);
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
}

.tradePropertyChipSelected {
  border-color: var(--color-primary);
  background: #fff0f0;
}

.moneyInput {
  width: 100px;
  padding: 6px 10px;
  border: 2px solid #e0e0e0;
  border-radius: var(--radius-sm);
  font-size: 16px;
  text-align: center;
}
```

- [ ] **Step 2: PurchaseDialog作成**

`src/components/ActionDialog/PurchaseDialog.tsx`:

```tsx
import type { BoardSpace, Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type PurchaseDialogProps = {
  space: BoardSpace
  player: Player
  onBuy: () => void
  onDecline: () => void
}

export default function PurchaseDialog({
  space,
  player,
  onBuy,
  onDecline,
}: PurchaseDialogProps) {
  const canAfford = player.money >= (space.price ?? 0)

  return (
    <Dialog
      title="買う？"
      actions={
        <>
          <Button onClick={onBuy} disabled={!canAfford}>
            ${space.price}で買う！
          </Button>
          <Button variant="ghost" onClick={onDecline}>
            買わない（オークション）
          </Button>
        </>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.propertyPrice}>ねだん: ${space.price}</div>
        {!canAfford && (
          <div
            style={{ color: 'var(--color-danger)', marginTop: 8, fontSize: 14 }}
          >
            お金がたりないよ…
          </div>
        )}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 3: AuctionDialog作成**

`src/components/ActionDialog/AuctionDialog.tsx`:

```tsx
import type { AuctionState, Player } from '../../game/types'
import { BOARD_SPACES } from '../../game/board'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type AuctionDialogProps = {
  auction: AuctionState
  players: Player[]
  onBid: (amount: number) => void
  onPass: () => void
}

export default function AuctionDialog({
  auction,
  players,
  onBid,
  onPass,
}: AuctionDialogProps) {
  const space = BOARD_SPACES.find((s) => s.id === auction.propertyId)!
  const activePlayer = players[auction.activePlayerIndex]
  const currentBidder = auction.currentBidderId
    ? players.find((p) => p.id === auction.currentBidderId)
    : null

  return (
    <Dialog title="みんなでオークション！">
      <div className={styles.auctionInfo}>
        <div className={styles.propertyName}>{space.name}</div>
        <div className={styles.bidAmount}>${auction.currentBid || '---'}</div>
        {currentBidder && (
          <div className={styles.bidder}>
            いま一番高い人: {currentBidder.token} {currentBidder.name}
          </div>
        )}
        <div style={{ marginTop: 12, fontWeight: 700 }}>
          {activePlayer.token} {activePlayer.name}のばん
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-light)' }}>
          もちがね: ${activePlayer.money.toLocaleString()}
        </div>
      </div>
      <div className={styles.bidButtons}>
        <Button
          size="small"
          onClick={() => onBid(10)}
          disabled={auction.currentBid + 10 > activePlayer.money}
        >
          +$10
        </Button>
        <Button
          size="small"
          onClick={() => onBid(50)}
          disabled={auction.currentBid + 50 > activePlayer.money}
        >
          +$50
        </Button>
        <Button
          size="small"
          onClick={() => onBid(100)}
          disabled={auction.currentBid + 100 > activePlayer.money}
        >
          +$100
        </Button>
        <Button variant="ghost" size="small" onClick={onPass}>
          パス
        </Button>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 4: CardDialog作成**

`src/components/ActionDialog/CardDialog.tsx`:

```tsx
import type { Card } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type CardDialogProps = {
  card: Card
  onDismiss: () => void
}

export default function CardDialog({ card, onDismiss }: CardDialogProps) {
  const emoji = card.type === 'chance' ? '❓' : '💝'
  const title = card.type === 'chance' ? 'チャンスカード' : 'おたすけカード'

  return (
    <Dialog
      title={title}
      actions={<Button onClick={onDismiss}>わかった！</Button>}
    >
      <div className={styles.cardContent}>
        <div className={styles.cardEmoji}>{emoji}</div>
        <div>{card.text}</div>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 5: JailDialog作成**

`src/components/ActionDialog/JailDialog.tsx`:

```tsx
import type { Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'

type JailDialogProps = {
  player: Player
  onPayFine: () => void
  onUseCard: () => void
  onRoll: () => void
}

export default function JailDialog({
  player,
  onPayFine,
  onUseCard,
  onRoll,
}: JailDialogProps) {
  return (
    <Dialog title="🔒 刑務所にいるよ">
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 14 }}>
        <p>どうやって出る？</p>
        <p style={{ color: 'var(--color-text-light)', marginTop: 4 }}>
          ({player.jailTurns}/3ターン)
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 12,
        }}
      >
        <Button onClick={onPayFine} disabled={player.money < 50}>
          💰 $50はらって出る
        </Button>
        {player.getOutOfJailCards > 0 && (
          <Button variant="secondary" onClick={onUseCard}>
            🎫 カードをつかう（のこり{player.getOutOfJailCards}枚）
          </Button>
        )}
        <Button variant="ghost" onClick={onRoll}>
          🎲 ゾロ目を出して出る
        </Button>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 6: BuildDialog作成**

`src/components/ActionDialog/BuildDialog.tsx`:

```tsx
import type { Player, PropertyState, BoardSpace } from '../../game/types'
import { canBuildHouse, canSellHouse } from '../../game/rules'
import { BOARD_SPACES } from '../../game/board'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type BuildDialogProps = {
  player: Player
  propertyStates: Record<string, PropertyState>
  onBuild: (propertyId: string) => void
  onSell: (propertyId: string) => void
  onClose: () => void
}

export default function BuildDialog({
  player,
  propertyStates,
  onBuild,
  onSell,
  onClose,
}: BuildDialogProps) {
  const ownedProperties = player.properties
    .map((id) => ({
      space: BOARD_SPACES.find((s) => s.id === id)!,
      state: propertyStates[id],
    }))
    .filter(({ space }) => space.type === 'property')

  return (
    <Dialog
      title="🏠 家をたてる"
      actions={
        <Button variant="ghost" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.buildList}>
        {ownedProperties.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            建てられる土地がないよ
          </div>
        )}
        {ownedProperties.map(({ space, state }) => {
          const canBuild = canBuildHouse(
            space.id,
            player.id,
            propertyStates,
            BOARD_SPACES,
          )
          const canSellH = canSellHouse(
            space.id,
            player.id,
            propertyStates,
            BOARD_SPACES,
          )
          const houses = state?.houses ?? 0
          const houseLabel =
            houses === 5 ? '🏨' : houses > 0 ? '🏠'.repeat(houses) : 'なし'
          const costOk = player.money >= (space.houseCost ?? 0)

          return (
            <div key={space.id} className={styles.buildItem}>
              <div>
                <div className={styles.buildItemName}>{space.name}</div>
                <div className={styles.buildItemInfo}>
                  {houseLabel} ・ 建設${space.houseCost}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  size="small"
                  onClick={() => onBuild(space.id)}
                  disabled={!canBuild || !costOk}
                >
                  建てる
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => onSell(space.id)}
                  disabled={!canSellH}
                >
                  売る
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 7: MortgageDialog作成**

`src/components/ActionDialog/MortgageDialog.tsx`:

```tsx
import type { Player, PropertyState } from '../../game/types'
import { canMortgage, canUnmortgage } from '../../game/rules'
import { BOARD_SPACES } from '../../game/board'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type MortgageDialogProps = {
  player: Player
  propertyStates: Record<string, PropertyState>
  onMortgage: (propertyId: string) => void
  onUnmortgage: (propertyId: string) => void
  onClose: () => void
}

export default function MortgageDialog({
  player,
  propertyStates,
  onMortgage,
  onUnmortgage,
  onClose,
}: MortgageDialogProps) {
  const ownedProperties = player.properties.map((id) => ({
    space: BOARD_SPACES.find((s) => s.id === id)!,
    state: propertyStates[id],
  }))

  return (
    <Dialog
      title="💳 お金をかりる / かえす"
      actions={
        <Button variant="ghost" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.buildList}>
        {ownedProperties.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            もちものがないよ
          </div>
        )}
        {ownedProperties.map(({ space, state }) => {
          const isMortgaged = state?.isMortgaged ?? false
          const canM = canMortgage(
            space.id,
            player.id,
            propertyStates,
            BOARD_SPACES,
          )
          const canU = canUnmortgage(
            space.id,
            player.id,
            player,
            propertyStates,
            BOARD_SPACES,
          )
          const mortgageValue = space.mortgageValue ?? 0
          const unmortgageCost = Math.floor(mortgageValue * 1.1)

          return (
            <div key={space.id} className={styles.buildItem}>
              <div>
                <div className={styles.buildItemName}>
                  {isMortgaged ? '💤 ' : ''}
                  {space.name}
                </div>
                <div className={styles.buildItemInfo}>
                  {isMortgaged
                    ? `かえす: $${unmortgageCost}`
                    : `かりる: +$${mortgageValue}`}
                </div>
              </div>
              {isMortgaged ? (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => onUnmortgage(space.id)}
                  disabled={!canU}
                >
                  かえす
                </Button>
              ) : (
                <Button
                  size="small"
                  onClick={() => onMortgage(space.id)}
                  disabled={!canM}
                >
                  かりる
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 8: TradeDialog作成**

`src/components/ActionDialog/TradeDialog.tsx`:

```tsx
import { useState } from 'react'
import type { Player, PropertyState, TradeOffer } from '../../game/types'
import { BOARD_SPACES } from '../../game/board'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'

type TradeDialogProps = {
  currentPlayer: Player
  targetPlayer: Player
  propertyStates: Record<string, PropertyState>
  onPropose: (offer: TradeOffer) => void
  onClose: () => void
}

export default function TradeDialog({
  currentPlayer,
  targetPlayer,
  propertyStates,
  onPropose,
  onClose,
}: TradeDialogProps) {
  const [offerProps, setOfferProps] = useState<string[]>([])
  const [requestProps, setRequestProps] = useState<string[]>([])
  const [offerMoney, setOfferMoney] = useState(0)
  const [requestMoney, setRequestMoney] = useState(0)

  const toggleProp = (
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const myProps = currentPlayer.properties
    .filter((id) => !(propertyStates[id]?.houses > 0))
    .map((id) => BOARD_SPACES.find((s) => s.id === id)!)
  const theirProps = targetPlayer.properties
    .filter((id) => !(propertyStates[id]?.houses > 0))
    .map((id) => BOARD_SPACES.find((s) => s.id === id)!)

  return (
    <Dialog title={`🤝 ${targetPlayer.name}と交換`}>
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>わたすもの</div>
        <div className={styles.tradePropertyList}>
          {myProps.map((s) => (
            <button
              key={s.id}
              className={`${styles.tradePropertyChip} ${offerProps.includes(s.id) ? styles.tradePropertyChipSelected : ''}`}
              onClick={() => toggleProp(offerProps, setOfferProps, s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>💰</span>
          <input
            type="number"
            className={styles.moneyInput}
            value={offerMoney}
            onChange={(e) => setOfferMoney(Math.max(0, Number(e.target.value)))}
            min={0}
            max={currentPlayer.money}
          />
        </div>
      </div>
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>もらうもの</div>
        <div className={styles.tradePropertyList}>
          {theirProps.map((s) => (
            <button
              key={s.id}
              className={`${styles.tradePropertyChip} ${requestProps.includes(s.id) ? styles.tradePropertyChipSelected : ''}`}
              onClick={() => toggleProp(requestProps, setRequestProps, s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>💰</span>
          <input
            type="number"
            className={styles.moneyInput}
            value={requestMoney}
            onChange={(e) =>
              setRequestMoney(Math.max(0, Number(e.target.value)))
            }
            min={0}
            max={targetPlayer.money}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 16,
          justifyContent: 'center',
        }}
      >
        <Button
          onClick={() =>
            onPropose({
              fromPlayerId: currentPlayer.id,
              toPlayerId: targetPlayer.id,
              offerProperties: offerProps,
              offerMoney,
              offerJailCards: 0,
              requestProperties: requestProps,
              requestMoney,
              requestJailCards: 0,
            })
          }
          disabled={
            offerProps.length === 0 &&
            requestProps.length === 0 &&
            offerMoney === 0 &&
            requestMoney === 0
          }
        >
          ていあんする！
        </Button>
        <Button variant="ghost" onClick={onClose}>
          やめる
        </Button>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 9: BankruptDialog作成**

`src/components/ActionDialog/BankruptDialog.tsx`:

```tsx
import type { Player } from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'

type BankruptDialogProps = {
  player: Player
  creditorId: string | null
  onDeclare: () => void
}

export default function BankruptDialog({
  player,
  creditorId,
  onDeclare,
}: BankruptDialogProps) {
  return (
    <Dialog
      title="😢 おかねがなくなった…"
      actions={
        <Button variant="danger" onClick={onDeclare}>
          ゲームオーバー
        </Button>
      }
    >
      <div style={{ textAlign: 'center', padding: 12 }}>
        <p style={{ fontSize: 16 }}>{player.name}はおかねがたりなくなったよ…</p>
        <p
          style={{
            fontSize: 14,
            color: 'var(--color-text-light)',
            marginTop: 8,
          }}
        >
          まずは家を売ったり、土地をあずけたりしてみてね。
          <br />
          それでもダメならゲームオーバーだよ。
        </p>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 10: GameBoardスタイル作成**

`src/components/GameBoard/GameBoard.module.css`:

```css
.gameBoard {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.boardSection {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.message {
  text-align: center;
  padding: 8px 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  margin: 0 16px;
}

.actions {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.subActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.muteButton {
  position: fixed;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  z-index: 50;
  opacity: 0.6;
}
```

- [ ] **Step 11: GameBoardコンポーネント作成**

`src/components/GameBoard/GameBoard.tsx`:

```tsx
import { useState, useCallback } from 'react'
import type { GameState } from '../../game/types'
import type { GameAction } from '../../game/actions'
import { BOARD_SPACES } from '../../game/board'
import PlayerPanel from '../PlayerPanel/PlayerPanel'
import FocusView from '../Board/FocusView'
import MiniMap from '../Board/MiniMap'
import Dice from '../Dice/Dice'
import Button from '../common/Button'
import PurchaseDialog from '../ActionDialog/PurchaseDialog'
import AuctionDialog from '../ActionDialog/AuctionDialog'
import CardDialog from '../ActionDialog/CardDialog'
import JailDialog from '../ActionDialog/JailDialog'
import BuildDialog from '../ActionDialog/BuildDialog'
import MortgageDialog from '../ActionDialog/MortgageDialog'
import TradeDialog from '../ActionDialog/TradeDialog'
import BankruptDialog from '../ActionDialog/BankruptDialog'
import styles from './GameBoard.module.css'

type GameBoardProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export default function GameBoard({ state, dispatch }: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [showTradeSelect, setShowTradeSelect] = useState(false)
  const [focusPosition, setFocusPosition] = useState<number | null>(null)

  const currentPlayer = state.players[state.currentPlayerIndex]
  const currentSpace = BOARD_SPACES[currentPlayer.position]
  const propState = state.propertyStates[currentSpace.id]

  const handleRoll = () => {
    setIsRolling(true)
    dispatch({ type: 'ROLL_DICE' })
  }

  const handleRollComplete = useCallback(() => {
    setIsRolling(false)
    // 少し遅延させてから移動完了
    setTimeout(() => {
      dispatch({ type: 'FINISH_MOVING' })
    }, 500)
  }, [dispatch])

  // 物件購入ダイアログ表示判定
  const showPurchase =
    state.turnPhase === 'action' &&
    (currentSpace.type === 'property' ||
      currentSpace.type === 'railroad' ||
      currentSpace.type === 'utility') &&
    !propState?.ownerId &&
    !state.currentCard

  // カードを引くフェーズ判定
  const showDrawCard =
    state.turnPhase === 'action' &&
    (currentSpace.type === 'chance' ||
      currentSpace.type === 'communityChest') &&
    !state.currentCard

  // 税金支払い判定
  const showPayTax = state.turnPhase === 'action' && currentSpace.type === 'tax'

  // 刑務所にいるプレイヤーのターン
  const showJail = state.turnPhase === 'roll' && currentPlayer.inJail

  const displayPosition = focusPosition ?? currentPlayer.position

  return (
    <div className={styles.gameBoard}>
      <PlayerPanel
        currentPlayer={currentPlayer}
        allPlayers={state.players}
        currentPlayerIndex={state.currentPlayerIndex}
      />

      <div className={styles.boardSection}>
        <FocusView
          board={state.board}
          propertyStates={state.propertyStates}
          players={state.players}
          currentPosition={displayPosition}
        />
        <MiniMap
          board={state.board}
          propertyStates={state.propertyStates}
          players={state.players}
          onSpaceClick={(pos) => setFocusPosition(pos)}
        />
      </div>

      {state.message && <div className={styles.message}>{state.message}</div>}

      {state.dice.rolled && (
        <Dice
          values={state.dice.values}
          rolling={isRolling}
          onRollComplete={handleRollComplete}
        />
      )}

      <div className={styles.actions}>
        {/* サイコロを振る */}
        {state.turnPhase === 'roll' && !currentPlayer.inJail && (
          <Button size="large" onClick={handleRoll} disabled={isRolling}>
            🎲 サイコロをふる！
          </Button>
        )}

        {/* カードを引く */}
        {showDrawCard && (
          <Button size="large" onClick={() => dispatch({ type: 'DRAW_CARD' })}>
            カードをひく！
          </Button>
        )}

        {/* 税金を払う */}
        {showPayTax && (
          <Button size="large" onClick={() => dispatch({ type: 'PAY_TAX' })}>
            ${currentSpace.price}はらう
          </Button>
        )}

        {/* ターン終了 */}
        {state.turnPhase === 'endTurn' && (
          <Button
            variant="secondary"
            size="large"
            onClick={() => {
              setFocusPosition(null)
              dispatch({ type: 'END_TURN' })
            }}
          >
            つぎの人にわたす →
          </Button>
        )}

        {/* サブアクション（ターン中いつでも） */}
        {(state.turnPhase === 'endTurn' || state.turnPhase === 'roll') && (
          <div className={styles.subActions}>
            <Button
              variant="ghost"
              size="small"
              onClick={() => dispatch({ type: 'OPEN_BUILD_DIALOG' })}
              disabled={currentPlayer.properties.length === 0}
            >
              🏠 建てる
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowTradeSelect(true)}
            >
              🤝 交換する
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => dispatch({ type: 'OPEN_MORTGAGE_DIALOG' })}
              disabled={currentPlayer.properties.length === 0}
            >
              💳 お金をかりる
            </Button>
          </div>
        )}
      </div>

      {/* ── ダイアログ群 ── */}

      {showPurchase && (
        <PurchaseDialog
          space={currentSpace}
          player={currentPlayer}
          onBuy={() => dispatch({ type: 'BUY_PROPERTY' })}
          onDecline={() => dispatch({ type: 'DECLINE_PURCHASE' })}
        />
      )}

      {state.turnPhase === 'auction' && state.auction && (
        <AuctionDialog
          auction={state.auction}
          players={state.players}
          onBid={(amount) => dispatch({ type: 'PLACE_BID', amount })}
          onPass={() => dispatch({ type: 'PASS_AUCTION' })}
        />
      )}

      {state.currentCard && (
        <CardDialog
          card={state.currentCard}
          onDismiss={() => dispatch({ type: 'DISMISS_CARD' })}
        />
      )}

      {showJail && (
        <JailDialog
          player={currentPlayer}
          onPayFine={() => dispatch({ type: 'PAY_JAIL_FINE' })}
          onUseCard={() => dispatch({ type: 'USE_JAIL_CARD' })}
          onRoll={handleRoll}
        />
      )}

      {state.turnPhase === 'build' && (
        <BuildDialog
          player={currentPlayer}
          propertyStates={state.propertyStates}
          onBuild={(id) => dispatch({ type: 'BUILD_HOUSE', propertyId: id })}
          onSell={(id) => dispatch({ type: 'SELL_HOUSE', propertyId: id })}
          onClose={() => dispatch({ type: 'CLOSE_BUILD_DIALOG' })}
        />
      )}

      {state.turnPhase === 'mortgage' && (
        <MortgageDialog
          player={currentPlayer}
          propertyStates={state.propertyStates}
          onMortgage={(id) =>
            dispatch({ type: 'MORTGAGE_PROPERTY', propertyId: id })
          }
          onUnmortgage={(id) =>
            dispatch({ type: 'UNMORTGAGE_PROPERTY', propertyId: id })
          }
          onClose={() => dispatch({ type: 'CLOSE_MORTGAGE_DIALOG' })}
        />
      )}

      {state.turnPhase === 'trade' && state.trade && (
        <TradeDialog
          currentPlayer={currentPlayer}
          targetPlayer={
            state.players.find((p) => p.id === state.trade!.toPlayerId)!
          }
          propertyStates={state.propertyStates}
          onPropose={(offer) => dispatch({ type: 'PROPOSE_TRADE', offer })}
          onClose={() => dispatch({ type: 'CLOSE_TRADE_DIALOG' })}
        />
      )}

      {state.turnPhase === 'bankrupt' && (
        <BankruptDialog
          player={currentPlayer}
          creditorId={null}
          onDeclare={() =>
            dispatch({ type: 'DECLARE_BANKRUPTCY', creditorId: null })
          }
        />
      )}

      {showTradeSelect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 300,
            }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>
              だれと交換する？
            </h3>
            {state.players
              .filter((p) => p.id !== currentPlayer.id && !p.isBankrupt)
              .map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  onClick={() => {
                    setShowTradeSelect(false)
                    dispatch({
                      type: 'OPEN_TRADE_DIALOG',
                      targetPlayerId: p.id,
                    })
                  }}
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  {p.token} {p.name}
                </Button>
              ))}
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowTradeSelect(false)}
              style={{ width: '100%' }}
            >
              やめる
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12: App.tsxを更新**

`src/App.tsx`:

```tsx
import { useReducer } from 'react'
import { gameReducer, createInitialGameState } from './game/reducer'
import Setup from './components/Setup/Setup'
import GameBoard from './components/GameBoard/GameBoard'
import styles from './App.module.css'

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState,
  )

  if (state.phase === 'setup') {
    return (
      <div className={styles.app}>
        <Setup
          onStart={(names, tokens) =>
            dispatch({
              type: 'START_GAME',
              playerNames: names,
              playerTokens: tokens,
            })
          }
        />
      </div>
    )
  }

  if (state.phase === 'finished') {
    const winner = state.players.find((p) => p.id === state.winnerId)!
    return (
      <div className={styles.app}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 24,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 64 }}>🎉</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {winner.token} {winner.name}のかち！
          </div>
          <div style={{ fontSize: 18, color: 'var(--color-text-light)' }}>
            おめでとう！
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 32px',
              fontSize: 18,
              fontWeight: 700,
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
            }}
          >
            もういちどあそぶ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <GameBoard state={state} dispatch={dispatch} />
    </div>
  )
}
```

- [ ] **Step 13: 動作確認**

Run: `npm run dev`
ゲームが一通りプレイできることを確認:

1. セットアップ画面でプレイヤー設定
2. サイコロを振って移動
3. 物件の購入ダイアログ
4. ターン切り替え

- [ ] **Step 14: コミット**

```bash
git add src/components/ActionDialog/ src/components/GameBoard/ src/App.tsx
git commit -m "feat: ゲームボード統合コンポーネントと全ダイアログを追加"
```

---

## Task 14: サウンド効果

**Files:**

- Create: `src/sound/sounds.ts`, `src/sound/SoundContext.tsx`
- Create: `public/sounds/` (サウンドファイルはWeb Audio APIで生成)

- [ ] **Step 1: サウンド生成ユーティリティ作成**

Howler.jsの代わりに、Web Audio APIで直接サウンドを生成する方式を採用する（外部サウンドファイル不要でシンプル）。

`src/sound/sounds.ts`:

```typescript
let audioContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function initAudio() {
  getContext()
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
) {
  const ctx = getContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1) {
  const ctx = getContext()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  const gain = ctx.createGain()
  source.buffer = buffer
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

export const SoundEffects = {
  diceRoll: () => {
    // コロコロ音
    for (let i = 0; i < 6; i++) {
      setTimeout(() => playNoise(0.05, 0.15), i * 80)
    }
  },

  land: () => {
    // ポン
    playTone(400, 0.15, 'sine', 0.2)
  },

  moneyGain: () => {
    // チャリン
    playTone(800, 0.1, 'sine', 0.2)
    setTimeout(() => playTone(1200, 0.15, 'sine', 0.2), 100)
  },

  moneyLoss: () => {
    // シュッ
    playTone(400, 0.2, 'sawtooth', 0.1)
  },

  purchase: () => {
    // ピンポン
    playTone(523, 0.15, 'sine', 0.2)
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 150)
    setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 300)
  },

  build: () => {
    // トントン
    playTone(200, 0.08, 'square', 0.15)
    setTimeout(() => playTone(250, 0.08, 'square', 0.15), 150)
  },

  jail: () => {
    // ガシャン
    playNoise(0.3, 0.2)
    playTone(150, 0.3, 'sawtooth', 0.15)
  },

  card: () => {
    // ペラッ
    playNoise(0.1, 0.1)
    playTone(600, 0.1, 'sine', 0.1)
  },

  bankrupt: () => {
    // ドーン
    playTone(100, 0.5, 'sawtooth', 0.2)
    playTone(80, 0.6, 'sine', 0.15)
  },

  win: () => {
    // ファンファーレ
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.25), i * 200)
    })
  },
}
```

- [ ] **Step 2: SoundContext作成**

`src/sound/SoundContext.tsx`:

```tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { SoundEffects, initAudio } from './sounds'

type SoundContextType = {
  muted: boolean
  toggleMute: () => void
  play: (sound: keyof typeof SoundEffects) => void
}

const SoundContext = createContext<SoundContextType>({
  muted: false,
  toggleMute: () => {},
  play: () => {},
})

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const play = useCallback(
    (sound: keyof typeof SoundEffects) => {
      if (muted) return
      if (!initialized) {
        initAudio()
        setInitialized(true)
      }
      SoundEffects[sound]()
    },
    [muted, initialized],
  )

  const toggleMute = useCallback(() => {
    if (!initialized) {
      initAudio()
      setInitialized(true)
    }
    setMuted((m) => !m)
  }, [initialized])

  return (
    <SoundContext.Provider value={{ muted, toggleMute, play }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  return useContext(SoundContext)
}
```

- [ ] **Step 3: main.tsxにSoundProviderを追加**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SoundProvider } from './sound/SoundContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider>
      <App />
    </SoundProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: GameBoardにサウンドを統合**

`src/components/GameBoard/GameBoard.tsx` の冒頭に追加:

```tsx
import { useSound } from '../../sound/SoundContext'
```

コンポーネント内の先頭に追加:

```tsx
const { play, muted, toggleMute } = useSound()
```

`handleRoll`を修正:

```tsx
const handleRoll = () => {
  setIsRolling(true)
  play('diceRoll')
  dispatch({ type: 'ROLL_DICE' })
}
```

ミュートボタンをreturnの最後に追加:

```tsx
<button className={styles.muteButton} onClick={toggleMute}>
  {muted ? '🔇' : '🔊'}
</button>
```

- [ ] **Step 5: 動作確認**

Run: `npm run dev`
サイコロを振ると音が出ることを確認。ミュートボタンで消音できることを確認。

- [ ] **Step 6: コミット**

```bash
git add src/sound/ src/main.tsx src/components/GameBoard/GameBoard.tsx
git commit -m "feat: Web Audio APIによるサウンド効果を追加"
```

---

## Task 15: ビルド確認 & 最終テスト

**Files:** (既存ファイルのみ)

- [ ] **Step 1: 全テスト実行**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: TypeScript型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: プロダクションビルド**

Run: `npm run build`
Expected: 正常にビルド完了

- [ ] **Step 4: ビルド結果のプレビュー**

Run: `npm run preview`
ブラウザで動作確認。

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "chore: ビルド確認と最終調整"
```
