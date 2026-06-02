// P3-a 拡張: 変動金利ローン・クレジットスコアの純粋関数層
// economy.ts / altAssets.ts と同様に副作用なしで実装する。
// reducer.ts は applyLoanAction / applyLoanEndTurn の2つだけを呼ぶ薄いラッパーに徹する。

import { mulberry32 } from '../random';
import { calculateTotalAssets } from '../rules';
import { sellCrypto } from './altAssets';
import type { GameState, LoanState, Player } from '../types';
import type { ColorGroup, ColorGroupStock } from '../types';
import type { GameAction } from '../actions';

// ── 定数 ──

export const BASE_RATE_INITIAL = 0.05; // 初期基準金利 5%
export const BASE_RATE_MIN = 0.01; // 最低 1%
export const BASE_RATE_MAX = 0.3; // 最高 30%
export const BASE_RATE_UPDATE_INTERVAL = 5; // 毎5ターンで変動
export const LOAN_SPREAD = 0.02; // スプレッド 2%
export const LOAN_PERIODS = 10; // 返済回数（ターン数）

// ── 純粋計算関数 ──

// クレジットスコアファクター: 物件所有率に応じた金利上乗せ係数
// ownershipRatio < 0.25 → 1.5（低信用）
// 0.25 ≤ ratio ≤ 0.50 → 1.0（標準）
// ratio > 0.50 → 0.7（高信用）
export function calculateCreditScoreFactor(ownershipRatio: number): number {
  if (ownershipRatio < 0.25) return 1.5;
  if (ownershipRatio <= 0.5) return 1.0;
  return 0.7;
}

// 借入金利 = base_rate + spread × credit_score_factor
export function calculateLoanInterestRate(
  baseRate: number,
  creditScoreFactor: number,
): number {
  return baseRate + LOAN_SPREAD * creditScoreFactor;
}

// 借入上限 = 総資産 × 50%（切り捨て）
export function calculateMaxLoan(totalAssetValue: number): number {
  return Math.floor(totalAssetValue * 0.5);
}

// 元利均等返済額（切り上げ）
// PMT = P × r(1+r)^n / ((1+r)^n - 1)
// r=0 のフォールバック: P/n（切り上げ）
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  periods: number,
): number {
  if (principal <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / periods);
  const r = annualRate;
  const factor = Math.pow(1 + r, periods);
  return Math.ceil((principal * r * factor) / (factor - 1));
}

// 基準金利変動: turnCount が BASE_RATE_UPDATE_INTERVAL の倍数のときのみ更新
// mulberry32 シードで再現可能な ±1〜3% 変動、[BASE_RATE_MIN, BASE_RATE_MAX] にクランプ
export function calculateNextBaseRate(
  currentRate: number,
  turnCount: number,
): number {
  if (turnCount === 0 || turnCount % BASE_RATE_UPDATE_INTERVAL !== 0) {
    return currentRate;
  }
  const seed = (turnCount * 7_919) >>> 0;
  const rng = mulberry32(seed);
  const raw1 = rng(); // 変動幅: 1, 2, or 3%
  const raw2 = rng(); // 方向: 上昇 or 下降
  const changeSteps = Math.floor(raw1 * 3) + 1; // 1, 2, 3
  const change = changeSteps * 0.01;
  const direction = raw2 < 0.5 ? -1 : 1;
  const newRate = currentRate + direction * change;
  return Math.max(BASE_RATE_MIN, Math.min(BASE_RATE_MAX, newRate));
}

// ── 破産時の非不動産資産清算（優先順位: ①暗号資産→②VC→③株式） ──
// 不動産は既存の forceSell/DECLARE_BANKRUPTCY フローで処理するため対象外
export function liquidateNonPropertyAssets(
  player: Player,
  stockMarket: Partial<Record<ColorGroup, ColorGroupStock>> | undefined,
): { updatedPlayer: Player; proceeds: number } {
  let proceeds = 0;
  let updated = { ...player };

  // ① 暗号資産
  if (updated.cryptoHolding) {
    proceeds += sellCrypto(updated.cryptoHolding);
    updated = { ...updated, cryptoHolding: undefined };
  }

  // ② スタートアップVC（未精算分は投資額をそのまま回収）
  if (updated.vcInvestments && updated.vcInvestments.length > 0) {
    for (const vc of updated.vcInvestments) {
      proceeds += vc.amount;
    }
    updated = { ...updated, vcInvestments: undefined };
  }

  // ③ 株式（現在の市場価格で換金）
  if (updated.stocks && stockMarket) {
    for (const [color, shares] of Object.entries(updated.stocks)) {
      const market = stockMarket[color as ColorGroup];
      if (market && shares && shares > 0) {
        proceeds += market.pricePerShare * shares;
      }
    }
    updated = { ...updated, stocks: undefined };
  }

  return {
    updatedPlayer: { ...updated, money: updated.money + proceeds },
    proceeds,
  };
}

// ── 1回分のローン返済を適用する内部ヘルパー ──
function applyOneRepayment(player: Player): Player {
  const loan = player.loan;
  if (!loan) return player;

  // 元利均等返済の利息分と元本分を計算
  const interestPayment = Math.floor(loan.principal * loan.annualRate);
  const principalPayment = Math.max(0, loan.monthlyPayment - interestPayment);
  const newPrincipal = Math.max(0, loan.principal - principalPayment);
  const newRemainingPayments = loan.remainingPayments - 1;

  if (newRemainingPayments <= 0 || newPrincipal <= 0) {
    // 完済: 残元本と最後の利息分を一括精算
    const finalPayment = loan.principal + interestPayment;
    return { ...player, money: player.money - finalPayment, loan: undefined };
  }

  return {
    ...player,
    money: player.money - loan.monthlyPayment,
    loan: {
      ...loan,
      principal: newPrincipal,
      remainingPayments: newRemainingPayments,
    },
  };
}

// ── 単一エントリポイント: TAKE_LOAN / REPAY_LOAN アクションの処理 ──
export function applyLoanAction(
  state: GameState,
  action: GameAction,
): GameState {
  switch (action.type) {
    case 'TAKE_LOAN': {
      if (!state.features?.loan) return state;
      const player = state.players[state.currentPlayerIndex];
      if (!player || player.isBankrupt) return state;
      if (action.amount <= 0) return state;
      if (player.loan) return state; // 既存ローンがある場合は追加借入不可

      // 借入上限チェック（calculateTotalAssets は rules.ts から）
      const totalAssets = calculateTotalAssets(
        player,
        state.propertyStates,
        state.board,
      );
      const maxLoan = calculateMaxLoan(totalAssets);
      if (action.amount > maxLoan) return state;

      // クレジットスコア計算（物件所有率）
      const totalProperties = state.board.filter(
        (s) =>
          s.type === 'property' ||
          s.type === 'railroad' ||
          s.type === 'utility',
      ).length;
      const ownershipRatio =
        totalProperties > 0 ? player.properties.length / totalProperties : 0;
      const creditScoreFactor = calculateCreditScoreFactor(ownershipRatio);

      const baseRate = state.baseRate ?? BASE_RATE_INITIAL;
      const annualRate = calculateLoanInterestRate(baseRate, creditScoreFactor);
      const monthlyPayment = calculateMonthlyPayment(
        action.amount,
        annualRate,
        LOAN_PERIODS,
      );

      const loan: LoanState = {
        principal: action.amount,
        annualRate,
        monthlyPayment,
        remainingPayments: LOAN_PERIODS,
      };

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, money: p.money + action.amount, loan }
          : p,
      );

      return { ...state, players: newPlayers };
    }

    case 'REPAY_LOAN': {
      if (!state.features?.loan) return state;
      const player = state.players[state.currentPlayerIndex];
      if (!player || !player.loan) return state;

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? applyOneRepayment(p) : p,
      );
      return { ...state, players: newPlayers };
    }

    default:
      return state;
  }
}

// ── 単一エントリポイント: END_TURN 時のローン処理 ──
// 1. 基準金利変動（BASE_RATE_UPDATE_INTERVAL ターンごと）
// 2. 変動時は全プレイヤーのローン金利・返済額を再計算
// 3. 現在プレイヤーのローン返済を1回実行
export function applyLoanEndTurn(
  state: GameState,
  nextTurnCount: number,
): GameState {
  const currentBaseRate = state.baseRate ?? BASE_RATE_INITIAL;
  const newBaseRate = calculateNextBaseRate(currentBaseRate, nextTurnCount);
  const baseRateChanged = newBaseRate !== currentBaseRate;

  const totalProperties = state.board.filter(
    (s) =>
      s.type === 'property' || s.type === 'railroad' || s.type === 'utility',
  ).length;

  const newPlayers = state.players.map((p, i) => {
    if (p.isBankrupt || !p.loan) return p;

    let loan = p.loan;

    // 基準金利変動時: ローン金利と返済額を再計算
    if (baseRateChanged) {
      const ownershipRatio =
        totalProperties > 0 ? p.properties.length / totalProperties : 0;
      const creditScoreFactor = calculateCreditScoreFactor(ownershipRatio);
      const newAnnualRate = calculateLoanInterestRate(
        newBaseRate,
        creditScoreFactor,
      );
      const newMonthlyPayment = calculateMonthlyPayment(
        loan.principal,
        newAnnualRate,
        loan.remainingPayments,
      );
      loan = {
        ...loan,
        annualRate: newAnnualRate,
        monthlyPayment: newMonthlyPayment,
      };
    }

    // 現在プレイヤーのみ返済実行（他プレイヤーは金利更新のみ）
    if (i === state.currentPlayerIndex) {
      return applyOneRepayment({ ...p, loan });
    }

    return { ...p, loan };
  });

  return { ...state, baseRate: newBaseRate, players: newPlayers };
}
