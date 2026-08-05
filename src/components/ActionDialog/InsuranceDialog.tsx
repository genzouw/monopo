import { useId, useMemo } from 'react';
import type { BoardSpace, ColorGroup, Player } from '../../game/types';
import { getSpaceById } from '../../game/rules';
import {
  calculatePremium,
  FIRE_SCRAP_RATE,
  INSURANCE_COLLECT_INTERVAL,
  isPropertyInsured,
} from '../../game/insurance';
import { compareByColorOrder } from './colorSort';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

const COLOR_MAP: Record<ColorGroup, string> = {
  brown: 'var(--color-brown)',
  lightblue: 'var(--color-lightblue)',
  pink: 'var(--color-pink)',
  orange: 'var(--color-orange)',
  red: 'var(--color-red)',
  yellow: 'var(--color-yellow)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
  railroad: '#555',
};

const COLOR_ORDER: ColorGroup[] = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'blue',
];

type InsuranceDialogProps = {
  currentPlayer: Player;
  board: BoardSpace[];
  insuranceState: Record<string, boolean> | undefined;
  onBuy: (propertyId: string) => void;
  onCancel: (propertyId: string) => void;
  onClose: () => void;
};

/**
 * 火災リスクにそなえる不動産保険への加入・解約を行うダイアログ。
 *
 * 自分が所有する「土地（property）」ごとに保険をかけられる。加入すると
 * {@link INSURANCE_COLLECT_INTERVAL} ターンごとに保険料が徴収され、火災が
 * 発生しても評価額の全額が補填される（未加入だとスクラップ分しか戻らない）。
 *
 * @param props - コンポーネントの引数
 * @param props.currentPlayer - 保険を操作する現在のプレイヤー
 * @param props.board - 盤面のマス一覧（物件情報の参照に使用）
 * @param props.insuranceState - 物件IDごとの保険加入状態（未定義なら未加入）
 * @param props.onBuy - 保険に加入するときのコールバック（物件IDを渡す）
 * @param props.onCancel - 保険を解約するときのコールバック（物件IDを渡す）
 * @param props.onClose - ダイアログを閉じるときのコールバック
 * @returns 保険ダイアログの React 要素
 */
export default function InsuranceDialog({
  currentPlayer,
  board,
  insuranceState,
  onBuy,
  onCancel,
  onClose,
}: InsuranceDialogProps) {
  const hintIdBase = useId();
  // 火災リスクのある「土地（property）」のみ保険対象。鉄道・公共施設は除外する。
  // 60FPS アニメーション中の再レンダリングでの再計算を避けるためメモ化する。
  const ownedProperties = useMemo(() => {
    return currentPlayer.properties
      .map((id: string) => getSpaceById(id, board))
      .filter((s): s is BoardSpace => !!s && s.type === 'property')
      .sort((a, b) => compareByColorOrder(a.color, b.color, COLOR_ORDER));
  }, [currentPlayer.properties, board]);

  // 未加入時に火災で失う割合（%）。スクラップ率の裏返しを子供向けに表示する。
  const lossPercent = Math.round((1 - FIRE_SCRAP_RATE) * 100);

  return (
    <Dialog
      title="🔥 ほけん（火災にそなえる）"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          とじる
        </Button>
      }
    >
      <div className={styles.propertyInfo}>
        <div className={styles.propertyPrice}>
          もってるおかね: ${currentPlayer.money.toLocaleString()}
        </div>
        <div className={styles.propertyPrice} style={{ fontSize: 13 }}>
          ほけんに入ると{INSURANCE_COLLECT_INTERVAL}
          ターンごとにほけん料がいるけど、火事になったら全部もどってくるよ。
          入ってないと火事で{lossPercent}%なくなるよ
        </div>
      </div>

      <div className={styles.buildList}>
        {ownedProperties.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            ほけんに入れる土地がないよ
          </div>
        )}
        {ownedProperties.map((space) => {
          const insured = isPropertyInsured(insuranceState, space.id);
          const premium = calculatePremium(space.price ?? 0);
          const canAfford = currentPlayer.money >= premium;
          // title・aria-describedby・ヒント表示で同じ理由文言を使い回し、表示の齟齬（ドリフト）を防ぐ
          const buyDisabledReason = canAfford
            ? undefined
            : 'おかねがたりないよ';
          return (
            <div key={space.id} className={styles.buildItem}>
              {space.color && (
                <div
                  style={{
                    width: 6,
                    borderRadius: 3,
                    background: COLOR_MAP[space.color],
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div className={styles.buildItemName}>
                  {space.name}
                  {insured && (
                    <span style={{ color: 'var(--color-success)' }}>
                      ✅ 加入中
                    </span>
                  )}
                </div>
                <div className={styles.buildItemInfo}>
                  ほけん料: ${premium} / {INSURANCE_COLLECT_INTERVAL}ターン
                </div>
              </div>
              <div className={styles.buildItemActionColumn}>
                {insured ? (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => onCancel(space.id)}
                  >
                    かいやく
                  </Button>
                ) : (
                  <>
                    <Button
                      size="small"
                      onClick={() => onBuy(space.id)}
                      aria-disabled={!canAfford}
                      aria-describedby={
                        buyDisabledReason
                          ? `${hintIdBase}-buy-${space.id}`
                          : undefined
                      }
                      title={buyDisabledReason}
                    >
                      入る（${premium}）
                    </Button>
                    {buyDisabledReason && (
                      <div
                        id={`${hintIdBase}-buy-${space.id}`}
                        className={styles.noMoneyHintTight}
                        role="status"
                      >
                        {buyDisabledReason}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
