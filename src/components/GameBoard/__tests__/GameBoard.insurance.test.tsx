import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import GameBoard from '../GameBoard';
import { createInitialGameState, gameReducer } from '../../../game/reducer';
import type { GameState } from '../../../game/types';

afterEach(() => {
  cleanup();
});

/**
 * 保険機能の導線検証用に、現在のプレイヤーへ土地を1つ所有させた
 * ゲーム状態を組み立てるヘルパー。
 * @param options.enabled 保険機能フラグ（既定: true）
 * @param options.insured 対象の土地を加入済みにするか（既定: false）
 */
function makeInsuranceState(options?: {
  enabled?: boolean;
  insured?: boolean;
}): { state: GameState; propertyId: string; playerId: string } {
  const enabled = options?.enabled ?? true;
  const base = gameReducer(createInitialGameState(), {
    type: 'START_GAME',
    playerNames: ['たろう', 'はなこ'],
    playerTokens: ['🚗', '🎩'],
    features: { insurance: enabled },
  });
  const prop = base.board.find((s) => s.type === 'property');
  if (!prop) throw new Error('テスト用の土地マスが見つかりません');
  const current = base.players[base.currentPlayerIndex];
  const state: GameState = {
    ...base,
    // サブアクションを開ける手番フェーズに固定する
    turnPhase: 'endTurn',
    players: base.players.map((p, i) =>
      i === base.currentPlayerIndex
        ? { ...p, money: 1500, properties: [...p.properties, prop.id] }
        : p,
    ),
    propertyStates: {
      ...base.propertyStates,
      [prop.id]: { ownerId: current.id, houses: 0, isMortgaged: false },
    },
    insuranceState: options?.insured ? { [prop.id]: true } : {},
  };
  return { state, propertyId: prop.id, playerId: current.id };
}

describe('GameBoard 保険導線の統合', () => {
  it('保険機能が有効なとき「🔥 ほけん」ボタンを表示する', () => {
    const { state } = makeInsuranceState({ enabled: true });
    render(<GameBoard state={state} dispatch={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: '🔥 ほけん' }),
    ).toBeInTheDocument();
  });

  it('保険機能が無効なとき「🔥 ほけん」ボタンを表示しない', () => {
    const { state } = makeInsuranceState({ enabled: false });
    render(<GameBoard state={state} dispatch={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: '🔥 ほけん' }),
    ).not.toBeInTheDocument();
  });

  it('ボタン押下でダイアログが開き「入る」で BUY_INSURANCE を dispatch する', () => {
    const dispatch = vi.fn();
    const { state, propertyId } = makeInsuranceState();
    render(<GameBoard state={state} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('button', { name: '🔥 ほけん' }));
    // ダイアログが開いたことをタイトルで確認する
    expect(screen.getByText('🔥 ほけん（火災にそなえる）')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /入る/ }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'BUY_INSURANCE',
      propertyId,
    });
  });

  it('加入済みの土地は「かいやく」で CANCEL_INSURANCE を dispatch する', () => {
    const dispatch = vi.fn();
    const { state, propertyId } = makeInsuranceState({ insured: true });
    render(<GameBoard state={state} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('button', { name: '🔥 ほけん' }));
    fireEvent.click(screen.getByRole('button', { name: 'かいやく' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'CANCEL_INSURANCE',
      propertyId,
    });
  });
});
