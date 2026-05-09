import { useState, useId } from 'react'
import type {
  BoardSpace,
  ColorGroup,
  Player,
  PropertyState,
  TradeOffer,
} from '../../game/types'
import Dialog from '../common/Dialog'
import Button from '../common/Button'
import styles from './ActionDialog.module.css'
import { clamp } from './tradeDialog.utils'

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
}

type TradeDialogProps = {
  currentPlayer: Player
  targetPlayer: Player
  board: BoardSpace[]
  propertyStates: Record<string, PropertyState>
  onPropose: (offer: TradeOffer) => void
  onClose: () => void
}

export default function TradeDialog({
  currentPlayer,
  targetPlayer,
  board,
  propertyStates,
  onPropose,
  onClose,
}: TradeDialogProps) {
  const offerMoneyId = useId()
  const requestMoneyId = useId()
  const [offerProperties, setOfferProperties] = useState<string[]>([])
  const [requestProperties, setRequestProperties] = useState<string[]>([])
  const [offerMoney, setOfferMoney] = useState(0)
  const [requestMoney, setRequestMoney] = useState(0)

  const myProperties = currentPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter(
      (s): s is BoardSpace => !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
    )

  const theirProperties = targetPlayer.properties
    .map((id) => board.find((s) => s.id === id))
    .filter(
      (s): s is BoardSpace => !!s && (propertyStates[s.id]?.houses ?? 0) === 0,
    )

  const toggleOffer = (id: string) => {
    setOfferProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const toggleRequest = (id: string) => {
    setRequestProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

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
    })
  }

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
          {myProperties.map((space) => {
            const isSelected = offerProperties.includes(space.id)
            return (
              <button
                key={space.id}
                className={`${styles.tradePropertyChip} ${isSelected ? styles.tradePropertyChipSelected : ''}`}
                onClick={() => toggleOffer(space.id)}
                aria-pressed={isSelected}
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
            )
          })}
        </div>
        <div className={styles.moneyInputRow}>
          <label htmlFor={offerMoneyId} className={styles.moneyInputLabel}>
            おかね: $
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
              const raw = e.target.value
              if (raw === '') {
                setOfferMoney(0)
                return
              }
              const val = Number(raw)
              if (isNaN(val)) return
              setOfferMoney(clamp(val, currentPlayer.money))
            }}
          />
          <div className={styles.moneyQuickButtons}>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() =>
                setOfferMoney((prev) => clamp(prev + 10, currentPlayer.money))
              }
            >
              +$10
            </button>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() =>
                setOfferMoney((prev) => clamp(prev + 100, currentPlayer.money))
              }
            >
              +$100
            </button>
            <button
              type="button"
              className={styles.moneyQuickButtonClear}
              onClick={() => setOfferMoney(0)}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
      <div className={styles.tradeSection}>
        <div className={styles.tradeSectionTitle}>もらうもの</div>
        <div className={styles.tradePropertyList}>
          {theirProperties.map((space) => {
            const isSelected = requestProperties.includes(space.id)
            return (
              <button
                key={space.id}
                className={`${styles.tradePropertyChip} ${isSelected ? styles.tradePropertyChipSelected : ''}`}
                onClick={() => toggleRequest(space.id)}
                aria-pressed={isSelected}
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
            )
          })}
        </div>
        <div className={styles.moneyInputRow}>
          <label htmlFor={requestMoneyId} className={styles.moneyInputLabel}>
            おかね: $
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
              const raw = e.target.value
              if (raw === '') {
                setRequestMoney(0)
                return
              }
              const val = Number(raw)
              if (isNaN(val)) return
              setRequestMoney(clamp(val, targetPlayer.money))
            }}
          />
          <div className={styles.moneyQuickButtons}>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() =>
                setRequestMoney((prev) => clamp(prev + 10, targetPlayer.money))
              }
            >
              +$10
            </button>
            <button
              type="button"
              className={styles.moneyQuickButton}
              onClick={() =>
                setRequestMoney((prev) => clamp(prev + 100, targetPlayer.money))
              }
            >
              +$100
            </button>
            <button
              type="button"
              className={styles.moneyQuickButtonClear}
              onClick={() => setRequestMoney(0)}
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
