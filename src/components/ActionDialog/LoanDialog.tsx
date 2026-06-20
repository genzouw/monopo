import { useState, useId } from 'react';
import type { GameState, Player } from '../../game/types';
import type { LoanType } from '../../game/systems/loan';
import {
  calculateMaxLoanAmount,
  FIXED_LOAN_RATE,
  getLoanInterestRate,
  LOAN_INTEREST_RATES,
} from '../../game/systems/loan';
import { calculateTotalAssets } from '../../game/rules';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import styles from './ActionDialog.module.css';

const MAX_MONEY_INPUT_LENGTH = 6;

type LoanDialogProps = {
  state: GameState;
  currentPlayer: Player;
  onTakeLoan: (amount: number, loanType: LoanType) => void;
  onRepayLoan: (amount: number) => void;
  onClose: () => void;
};

export default function LoanDialog({
  state,
  currentPlayer,
  onTakeLoan,
  onRepayLoan,
  onClose,
}: LoanDialogProps) {
  const borrowHintId = useId();
  const repayHintId = useId();
  const [loanType, setLoanType] = useState<LoanType>('variable');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const totalAssets = calculateTotalAssets(
    currentPlayer,
    state.propertyStates,
    state.board,
  );
  const maxBorrow = calculateMaxLoanAmount(
    totalAssets,
    currentPlayer.loanBalance ?? 0,
  );
  const loanBalance = currentPlayer.loanBalance ?? 0;

  const variableRate = getLoanInterestRate(state, currentPlayer, 'variable');
  const fixedRate = FIXED_LOAN_RATE;
  const currentRate = loanType === 'fixed' ? fixedRate : variableRate;
  const formatRate = (rate: number) => `${Math.round(rate * 1000) / 10}`;

  const parsedBorrow = parseInt(borrowAmount, 10);
  const parsedRepay = parseInt(repayAmount, 10);
  const canBorrow =
    Number.isInteger(parsedBorrow) &&
    parsedBorrow > 0 &&
    parsedBorrow <= maxBorrow;
  const canRepay =
    Number.isInteger(parsedRepay) &&
    parsedRepay > 0 &&
    parsedRepay <= loanBalance &&
    parsedRepay <= currentPlayer.money;

  const economyLabel =
    state.economyStatus === 'boom'
      ? '好況'
      : state.economyStatus === 'normal'
        ? '通常'
        : state.economyStatus === 'recession'
          ? '不況'
          : state.economyStatus === 'crisis'
            ? '金融危機'
            : '—';

  return (
    <Dialog
      title="🏦 ローン（銀行から借りる）"
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
        <div className={styles.propertyPrice}>
          そうしさん: ${totalAssets.toLocaleString()} ／ かりられる上限: $
          {maxBorrow.toLocaleString()}
        </div>
        {loanBalance > 0 && (
          <div className={styles.propertyPrice}>
            ローン残高: ${loanBalance.toLocaleString()}（
            {currentPlayer.loanType === 'fixed' ? '固定金利' : '変動金利'}）
          </div>
        )}
        {currentPlayer.creditScore !== undefined && (
          <div className={styles.propertyPrice}>
            信用スコア: {currentPlayer.creditScore} ／ 金利調整:{' '}
            {Math.abs(
              variableRate -
                LOAN_INTEREST_RATES[state.economyStatus ?? 'normal'],
            ) > 1e-9
              ? `${formatRate(variableRate)}%（スコア割引適用）`
              : `${formatRate(variableRate)}%`}
          </div>
        )}

        {/* 借入セクション */}
        {maxBorrow > 0 && (
          <div className={styles.buildItem} style={{ marginTop: 12 }}>
            <div className={styles.buildItemContent}>
              <div className={styles.buildItemName}>💰 借りる</div>
              <div className={styles.buildItemInfo}>
                <label>
                  金利タイプ:&nbsp;
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                    style={{ marginLeft: 4 }}
                  >
                    <option value="variable">
                      変動金利（景気: {economyLabel} /{' '}
                      {formatRate(variableRate)}%）
                    </option>
                    <option value="fixed">
                      固定金利（{formatRate(fixedRate)}%・景気に左右されない）
                    </option>
                  </select>
                </label>
              </div>
              <div className={styles.buildItemInfo}>
                GOマス通過時に利息（元本×{formatRate(currentRate)}
                %）が引き落とされるよ
              </div>
              <div className={styles.buildItemActions}>
                <input
                  type="number"
                  min={1}
                  max={maxBorrow}
                  value={borrowAmount}
                  onChange={(e) => {
                    if (e.target.value.length > MAX_MONEY_INPUT_LENGTH) return;
                    setBorrowAmount(e.target.value);
                  }}
                  placeholder={`最大 $${maxBorrow}`}
                  style={{ width: 120 }}
                  aria-label="借入金額"
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (!canBorrow) return;
                    onTakeLoan(parsedBorrow, loanType);
                    setBorrowAmount('');
                  }}
                  aria-disabled={!canBorrow}
                  aria-describedby={!canBorrow ? borrowHintId : undefined}
                >
                  かりる
                </Button>
              </div>
              {!canBorrow && borrowAmount !== '' && (
                <div id={borrowHintId} className={styles.noMoneyHintTight} role="status">
                  かりられる金額を正しく入力してね
                </div>
              )}
            </div>
          </div>
        )}

        {/* 返済セクション */}
        {loanBalance > 0 && (
          <div className={styles.buildItem} style={{ marginTop: 12 }}>
            <div className={styles.buildItemContent}>
              <div className={styles.buildItemName}>💳 返済する</div>
              <div className={styles.buildItemActions}>
                <input
                  type="number"
                  min={1}
                  max={Math.min(loanBalance, currentPlayer.money)}
                  value={repayAmount}
                  onChange={(e) => {
                    if (e.target.value.length > MAX_MONEY_INPUT_LENGTH) return;
                    setRepayAmount(e.target.value);
                  }}
                  placeholder={`残高 $${loanBalance}`}
                  style={{ width: 120 }}
                  aria-label="返済金額"
                />
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => {
                    if (!canRepay) return;
                    onRepayLoan(parsedRepay);
                    setRepayAmount('');
                  }}
                  aria-disabled={!canRepay}
                  aria-describedby={!canRepay ? repayHintId : undefined}
                >
                  返済する
                </Button>
              </div>
              {!canRepay && repayAmount !== '' && (
                <div id={repayHintId} className={styles.noMoneyHintTight} role="status">
                  {parsedRepay > currentPlayer.money ? 'おかねがたりないよ' : '返済する金額を正しく入力してね'}
                </div>
              )}
            </div>
          </div>
        )}

        {maxBorrow === 0 && loanBalance === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 16,
              color: 'var(--color-text-light)',
            }}
          >
            借入可能なそうしさんが足りないよ
          </div>
        )}
      </div>
    </Dialog>
  );
}
