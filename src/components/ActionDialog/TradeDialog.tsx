import { useState, useId, useMemo } from 'react';
import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
  TradeOffer,
} from '../../game/types';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';
import { clamp } from './tradeDialog.utils';
import { getSpaceById } from '../../game/rules';

const MAX_MONEY_INPUT_LENGTH = 6;

const LABELS = {
  propose: 'ていあんする！',
  cancel: 'やめる',
  emptyHint: 'こうかんするものをえらんでね',
  offerSection: 'わたすもの',
  requestSection: 'もらうもの',
  noOfferProperties: 'わたせる土地がないよ',
  noRequestProperties: 'もらえる土地がないよ',
  moneyLabel: 'おかね: $',
  add10: '10ドル追加',
  add100: '100ドル追加',
  clearMoney: '金額をクリア',
} as const;

/** クイック操作ボタンが無効になる理由の文言 */
const DISABLED_REASONS = {
  overOwnMoney: '所持金を超えています',
  overTargetMoney: '相手の所持金を超えています',
  alreadyZero: 'すでに0です',
} as const;

/**
 * 無効状態のボタンについて、理由を含むアクセシブル名を組み立てる。
 * `title` はホバー依存でスクリーンリーダーやタッチ利用者に届かないため、
 * `aria-label` 側にも理由を含めて確実に伝える。
 *
 * @param label - 有効時のラベル
 * @param reason - 無効理由（有効な場合は `undefined`）
 * @returns 無効時は「ラベル。理由」、有効時はラベルそのもの
 */
const withDisabledReason = (label: string, reason?: string): string =>
  reason === undefined ? label : `${label}。${reason}`;

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

/**
 * Formats a property's name and price for display as a chip label.
 *
 * @param space - The board space representing the property.
 * @returns The formatted string label, e.g. "Property Name（$100）".
 */
const getPropertyChipLabel = (space: BoardSpace): string => {
  const priceStr = space.price != null ? `（$${space.price}）` : '';
  return `${space.name}${priceStr}`;
};

type TradeDialogProps = {
  currentPlayer: Player;
  targetPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onPropose: (offer: TradeOffer) => void;
  onClose: () => void;
};

/**
 * A dialog component that allows the current player to propose a trade
 * of properties and money with a target player.
 *
 * @param props - The properties passed to the component.
 * @returns The rendered TradeDialog component.
 */
export default function TradeDialog({
  currentPlayer,
  targetPlayer,
  board,
  propertyStates,
  onPropose,
  onClose,
}: TradeDialogProps) {
  const offerMoneyId = useId();
  const requestMoneyId = useId();
  const tradeEmptyHintId = useId();
  const offerMoneyErrorId = useId();
  const requestMoneyErrorId = useId();
  const [offerProperties, setOfferProperties] = useState<string[]>([]);
  const [requestProperties, setRequestProperties] = useState<string[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);

  // ⚡ Bolt: useMemo to prevent repeated mapping and filtering of property arrays on every render.
  // TradeDialog involves frequent state updates (typing money amount), and computing properties on every render hurts input latency.
  const myProperties = useMemo(() => {
    return currentPlayer.properties
      .map((id: string) => getSpaceById(id, board))
      .filter(
        (s): s is BoardSpace =>
          !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
      );
  }, [currentPlayer.properties, board, propertyStates]);

  const theirProperties = useMemo(() => {
    return targetPlayer.properties
      .map((id: string) => getSpaceById(id, board))
      .filter(
        (s): s is BoardSpace =>
          !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
      );
  }, [targetPlayer.properties, board, propertyStates]);

  const toggleOffer = (id: string) => {
    setOfferProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const toggleRequest = (id: string) => {
    setRequestProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const isOfferMoneyInvalid =
    offerMoney < 0 || offerMoney > currentPlayer.money;
  const isRequestMoneyInvalid =
    requestMoney < 0 || requestMoney > targetPlayer.money;
  const isTradeEmpty =
    offerProperties.length === 0 &&
    requestProperties.length === 0 &&
    offerMoney === 0 &&
    requestMoney === 0;

  // クイック操作ボタンの無効理由をここで一元管理し、
  // onClickガード・aria-disabled・aria-label・titleの4箇所で使い回すことで不整合を防ぐ
  // （`undefined` = 有効、文字列 = その理由で無効）
  const offerAdd10Reason =
    offerMoney + 10 > currentPlayer.money
      ? DISABLED_REASONS.overOwnMoney
      : undefined;
  const offerAdd100Reason =
    offerMoney + 100 > currentPlayer.money
      ? DISABLED_REASONS.overOwnMoney
      : undefined;
  const offerClearReason =
    offerMoney === 0 ? DISABLED_REASONS.alreadyZero : undefined;
  const requestAdd10Reason =
    requestMoney + 10 > targetPlayer.money
      ? DISABLED_REASONS.overTargetMoney
      : undefined;
  const requestAdd100Reason =
    requestMoney + 100 > targetPlayer.money
      ? DISABLED_REASONS.overTargetMoney
      : undefined;
  const requestClearReason =
    requestMoney === 0 ? DISABLED_REASONS.alreadyZero : undefined;

  const isOfferAdd10Disabled = offerAdd10Reason !== undefined;
  const isOfferAdd100Disabled = offerAdd100Reason !== undefined;
  const isOfferClearDisabled = offerClearReason !== undefined;
  const isRequestAdd10Disabled = requestAdd10Reason !== undefined;
  const isRequestAdd100Disabled = requestAdd100Reason !== undefined;
  const isRequestClearDisabled = requestClearReason !== undefined;

  // 提案ボタンの説明先IDを一元管理する。
  // 提示・要求の金額エラーが同時に発生した場合も両方のIDを空白区切りで参照させ、
  // スクリーンリーダーが片方の理由しか読み上げない状態を防ぐ
  const proposeDescribedBy =
    [
      isTradeEmpty ? tradeEmptyHintId : undefined,
      isOfferMoneyInvalid ? offerMoneyErrorId : undefined,
      isRequestMoneyInvalid ? requestMoneyErrorId : undefined,
    ]
      .filter((id): id is string => id !== undefined)
      .join(' ') || undefined;

  const handlePropose = () => {
    onPropose({
      fromPlayerId: currentPlayer.id,
      toPlayerId: targetPlayer.id,
      offerProperties,
      offerMoney,
      offerJailCards: 0,
      requestProperties,
      requestMoney,
      requestJailCards: 0,
    });
  };

  return (
    <Dialog
      title={`${targetPlayer.token} ${targetPlayer.name}とこうかん`}
      onClose={onClose}
      actions={
        <div className={styles.tradeActionArea}>
          <div className={styles.tradeActionButtons}>
            <Button
              onClick={handlePropose}
              aria-disabled={
                isTradeEmpty || isOfferMoneyInvalid || isRequestMoneyInvalid
              }
              aria-describedby={proposeDescribedBy}
              title={
                isTradeEmpty
                  ? LABELS.emptyHint
                  : isOfferMoneyInvalid || isRequestMoneyInvalid
                    ? '入力された金額が正しくありません'
                    : undefined
              }
            >
              {LABELS.propose}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {LABELS.cancel}
            </Button>
          </div>
          {isTradeEmpty && (
            <div
              id={tradeEmptyHintId}
              className={styles.tradeEmptyHint}
              role="status"
            >
              {LABELS.emptyHint}
            </div>
          )}
        </div>
      }
    >
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>{LABELS.offerSection}</div>
        <div className={styles.tradePropertyList}>
          {myProperties.length === 0 && (
            <div className={styles.tradeEmptyProperties}>
              {LABELS.noOfferProperties}
            </div>
          )}
          {myProperties.map((space) => {
            const isSelected = offerProperties.includes(space.id);
            const label = getPropertyChipLabel(space);
            return (
              <button
                key={space.id}
                className={`${styles.tradePropertyChip} ${isSelected ? styles.tradePropertyChipSelected : ''}`}
                onClick={() => toggleOffer(space.id)}
                aria-pressed={isSelected}
                title={label}
                aria-label={label}
              >
                {space.color && (
                  <span
                    className={styles.tradePropertyColor}
                    style={{ background: COLOR_MAP[space.color] }}
                    aria-hidden="true"
                  />
                )}
                <span>{space.name}</span>
                {space.price != null && (
                  <span className={styles.tradePropertyPrice}>
                    ${space.price}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={styles.moneyInputRow}>
          <label htmlFor={offerMoneyId} className={styles.moneyInputLabel}>
            {LABELS.moneyLabel}
          </label>
          <input
            id={offerMoneyId}
            className={styles.moneyInput}
            type="number"
            inputMode="numeric"
            min={0}
            max={currentPlayer.money}
            value={offerMoney === 0 ? '' : offerMoney}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw.length > MAX_MONEY_INPUT_LENGTH) return;
              if (raw === '') {
                setOfferMoney(0);
                return;
              }
              const val = Number(raw);
              if (isNaN(val)) return;
              // クランプを削除し、上限超過時にエラーとして表示できるようにする
              setOfferMoney(val);
            }}
            aria-invalid={isOfferMoneyInvalid}
            aria-errormessage={
              isOfferMoneyInvalid ? offerMoneyErrorId : undefined
            }
            aria-describedby={
              isOfferMoneyInvalid ? offerMoneyErrorId : undefined
            }
          />
          {isOfferMoneyInvalid && (
            <div
              id={offerMoneyErrorId}
              className={styles.tradeMoneyErrorHint}
              role="alert"
            >
              {offerMoney < 0
                ? '0以上の金額を入力してね'
                : '所持金を超えています'}
            </div>
          )}
          <div className={styles.moneyQuickButtons}>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() => {
                if (isOfferAdd10Disabled) return;
                setOfferMoney((prev) => clamp(prev + 10, currentPlayer.money));
              }}
              aria-label={withDisabledReason(LABELS.add10, offerAdd10Reason)}
              aria-disabled={isOfferAdd10Disabled}
              title={offerAdd10Reason}
            >
              +$10
            </button>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() => {
                if (isOfferAdd100Disabled) return;
                setOfferMoney((prev) => clamp(prev + 100, currentPlayer.money));
              }}
              aria-label={withDisabledReason(LABELS.add100, offerAdd100Reason)}
              aria-disabled={isOfferAdd100Disabled}
              title={offerAdd100Reason}
            >
              +$100
            </button>
            <button
              type="button"
              className={styles.moneyQuickButtonClear}
              onClick={() => {
                if (isOfferClearDisabled) return;
                setOfferMoney(0);
              }}
              aria-label={withDisabledReason(
                LABELS.clearMoney,
                offerClearReason,
              )}
              aria-disabled={isOfferClearDisabled}
              title={offerClearReason}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>{LABELS.requestSection}</div>
        <div className={styles.tradePropertyList}>
          {theirProperties.length === 0 && (
            <div className={styles.tradeEmptyProperties}>
              {LABELS.noRequestProperties}
            </div>
          )}
          {theirProperties.map((space) => {
            const isSelected = requestProperties.includes(space.id);
            const label = getPropertyChipLabel(space);
            return (
              <button
                key={space.id}
                className={`${styles.tradePropertyChip} ${isSelected ? styles.tradePropertyChipSelected : ''}`}
                onClick={() => toggleRequest(space.id)}
                aria-pressed={isSelected}
                title={label}
                aria-label={label}
              >
                {space.color && (
                  <span
                    className={styles.tradePropertyColor}
                    style={{ background: COLOR_MAP[space.color] }}
                    aria-hidden="true"
                  />
                )}
                <span>{space.name}</span>
                {space.price != null && (
                  <span className={styles.tradePropertyPrice}>
                    ${space.price}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={styles.moneyInputRow}>
          <label htmlFor={requestMoneyId} className={styles.moneyInputLabel}>
            {LABELS.moneyLabel}
          </label>
          <input
            id={requestMoneyId}
            className={styles.moneyInput}
            type="number"
            inputMode="numeric"
            min={0}
            max={targetPlayer.money}
            value={requestMoney === 0 ? '' : requestMoney}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value;
              if (raw.length > MAX_MONEY_INPUT_LENGTH) return;
              if (raw === '') {
                setRequestMoney(0);
                return;
              }
              const val = Number(raw);
              if (isNaN(val)) return;
              // クランプを削除し、上限超過時にエラーとして表示できるようにする
              setRequestMoney(val);
            }}
            aria-invalid={isRequestMoneyInvalid}
            aria-errormessage={
              isRequestMoneyInvalid ? requestMoneyErrorId : undefined
            }
            aria-describedby={
              isRequestMoneyInvalid ? requestMoneyErrorId : undefined
            }
          />
          {isRequestMoneyInvalid && (
            <div
              id={requestMoneyErrorId}
              className={styles.tradeMoneyErrorHint}
              role="alert"
            >
              {requestMoney < 0
                ? '0以上の金額を入力してね'
                : '相手の所持金を超えています'}
            </div>
          )}
          <div className={styles.moneyQuickButtons}>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() => {
                if (isRequestAdd10Disabled) return;
                setRequestMoney((prev) => clamp(prev + 10, targetPlayer.money));
              }}
              aria-label={withDisabledReason(LABELS.add10, requestAdd10Reason)}
              aria-disabled={isRequestAdd10Disabled}
              title={requestAdd10Reason}
            >
              +$10
            </button>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() => {
                if (isRequestAdd100Disabled) return;
                setRequestMoney((prev) =>
                  clamp(prev + 100, targetPlayer.money),
                );
              }}
              aria-label={withDisabledReason(
                LABELS.add100,
                requestAdd100Reason,
              )}
              aria-disabled={isRequestAdd100Disabled}
              title={requestAdd100Reason}
            >
              +$100
            </button>
            <button
              type="button"
              className={styles.moneyQuickButtonClear}
              onClick={() => {
                if (isRequestClearDisabled) return;
                setRequestMoney(0);
              }}
              aria-label={withDisabledReason(
                LABELS.clearMoney,
                requestClearReason,
              )}
              aria-disabled={isRequestClearDisabled}
              title={requestClearReason}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
