import { useState } from 'react';
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

type TradeDialogProps = {
  currentPlayer: Player;
  targetPlayer: Player;
  board: BoardSpace[];
  propertyStates: Record<string, PropertyState>;
  onPropose: (offer: TradeOffer) => void;
  onClose: () => void;
};

export default function TradeDialog({
  currentPlayer,
  targetPlayer,
  board,
  propertyStates,
  onPropose,
  onClose,
}: TradeDialogProps) {
  const [offerProperties, setOfferProperties] = useState<string[]>([]);
  const [requestProperties, setRequestProperties] = useState<string[]>([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);

  const myProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter(
      (s): s is BoardSpace => !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
    );

  const theirProperties = targetPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter(
      (s): s is BoardSpace => !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
    );

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
      actions={
        <>
          <Button onClick={handlePropose}>ていあんする！</Button>
          <Button variant="secondary" onClick={onClose}>
            やめる
          </Button>
        </>
      }
    >
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>わたすもの</div>
        <div className={styles.tradePropertyList}>
          {myProperties.map((space) => (
            <button
              key={space.id}
              className={`${styles.tradePropertyChip} ${offerProperties.includes(space.id) ? styles.tradePropertyChipSelected : ''}`}
              onClick={() => toggleOffer(space.id)}
            >
              {space.color && (
                <span
                  className={styles.tradePropertyColor}
                  style={{ background: COLOR_MAP[space.color] }}
                />
              )}
              <span>{space.name}</span>
              {space.price != null && (
                <span className={styles.tradePropertyPrice}>
                  ${space.price}
                </span>
              )}
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
          <span style={{ fontSize: 14 }}>おかね: $</span>
          <input
            className={styles.moneyInput}
            type="number"
            min={0}
            max={currentPlayer.money}
            value={offerMoney}
            onChange={(e) => setOfferMoney(Number(e.target.value))}
          />
        </div>
      </div>
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>もらうもの</div>
        <div className={styles.tradePropertyList}>
          {theirProperties.map((space) => (
            <button
              key={space.id}
              className={`${styles.tradePropertyChip} ${requestProperties.includes(space.id) ? styles.tradePropertyChipSelected : ''}`}
              onClick={() => toggleRequest(space.id)}
            >
              {space.color && (
                <span
                  className={styles.tradePropertyColor}
                  style={{ background: COLOR_MAP[space.color] }}
                />
              )}
              <span>{space.name}</span>
              {space.price != null && (
                <span className={styles.tradePropertyPrice}>
                  ${space.price}
                </span>
              )}
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
          <span style={{ fontSize: 14 }}>おかね: $</span>
          <input
            className={styles.moneyInput}
            type="number"
            min={0}
            max={targetPlayer.money}
            value={requestMoney}
            onChange={(e) => setRequestMoney(Number(e.target.value))}
          />
        </div>
      </div>
    </Dialog>
  );
}
