import { useState, useEffect, useId } from 'react';
import {
  TOKENS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_NAME_LENGTH,
} from '../../game/types';
import type { FeatureFlags, GameState } from '../../game/types';
import { loadSetupConfig, saveSetupConfig } from '../../game/storage';
import Button from '../common/Button';
import styles from './Setup.module.css';

type SetupProps = {
  onStart: (names: string[], tokens: string[], features: FeatureFlags) => void;
  onResume?: () => void;
  savedGame?: GameState | null;
};

// P1 拡張: 切り替え可能な拡張機能の一覧。子供向けメタファー名を併記する。
const FEATURE_TOGGLES: Array<{
  key: keyof FeatureFlags;
  label: string;
  description: string;
}> = [
  {
    key: 'stocks',
    label: '📈 おうえんカード（株式）',
    description:
      '色ごとに「おうえんカード」を売り買いできるよ。買うとねだんが上がって、売ると下がるよ。家をたてると人気が上がるよ',
  },
  {
    key: 'macroEconomy',
    label: '🌐 けいきサイクル（マクロ経済）',
    description:
      'ゲーム中に「好況」「不況」「金融危機」などの景気が変わるよ。景気がよいと家賃が増えて、悪いと減るよ',
  },
  {
    key: 'insurance',
    label: '🔥 ほけん（火災リスク）',
    description:
      '物件ごとに「ほけん」に入れるよ。10ターンごとにほけん料がいるけど、火事になったら全部もどってくるよ。入ってないと火事で80%なくなるから気をつけて',
  },
  {
    key: 'progressiveTax',
    label: '💰 ぜいきん（みんなで分けあう）',
    description:
      'おかねもちはたくさんぜいきんをはらうよ。あつまったおかねは「みんなのきんこ」にたまって、いちばんびんぼうな人にとどけられるよ',
  },
  {
    key: 'loan',
    label: '🏦 おかねをかりる（ローン）',
    description:
      'ぎんこうからおかねをかりられるよ。けいきがよいと利子（りそく）はやすくて、わるくなると高くなるよ。かりたぶんは少しずつかえそうね',
  },
];
const DEFAULT_NAMES = [
  'プレイヤー1',
  'プレイヤー2',
  'プレイヤー3',
  'プレイヤー4',
];
const DEFAULT_TOKENS: string[] = [TOKENS[0], TOKENS[1], TOKENS[2], TOKENS[3]];
const START_GUIDE_MSG = 'すべてのプレイヤーのなまえを入力してね';

/**
 * ゲーム開始前の初期設定画面コンポーネント。
 *
 * プレイヤー人数の増減、各プレイヤーのなまえ入力（文字数カウンター付き）、
 * コマの選択、および保存済みゲームの再開導線を提供する。
 *
 * @param onStart - 入力済みの名前一覧とコマ一覧でゲームを開始するコールバック。
 * @param onResume - 保存済みゲームを再開するコールバック。`savedGame` がある場合のみ表示。
 * @param savedGame - 直前に保存されたゲーム状態。存在すれば「つづきからあそぶ」UI を表示する。
 * @returns セットアップ画面の JSX 要素。
 */
export default function Setup({ onStart, onResume, savedGame }: SetupProps) {
  const baseId = useId();
  const [initialConfig] = useState(() => loadSetupConfig());
  const [playerCount, setPlayerCount] = useState(
    initialConfig?.playerCount ?? MIN_PLAYERS,
  );
  const [names, setNames] = useState<string[]>(
    initialConfig?.names ?? DEFAULT_NAMES,
  );
  const [selectedTokens, setSelectedTokens] = useState<string[]>(
    initialConfig?.tokens ?? DEFAULT_TOKENS,
  );
  // P1 拡張: 機能トグル（既定 OFF＝既存挙動互換）
  const [features, setFeatures] = useState<FeatureFlags>(
    initialConfig?.features ?? {},
  );

  useEffect(() => {
    saveSetupConfig({ playerCount, names, tokens: selectedTokens, features });
  }, [playerCount, names, selectedTokens, features]);

  const toggleFeature = (key: keyof FeatureFlags) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...names];
    // Security enhancement: enforce max length on names to prevent potential DoS or memory issues.
    // Use code-point-based truncation so emoji/surrogate-pair chars match the input's maxLength behavior.
    newNames[index] = [...name].slice(0, MAX_NAME_LENGTH).join('');
    setNames(newNames);
  };

  const handleTokenChange = (playerIndex: number, token: string) => {
    const newTokens = [...selectedTokens];
    const existingIndex = newTokens.findIndex(
      (t, i) => t === token && i !== playerIndex,
    );
    if (existingIndex !== -1) newTokens[existingIndex] = newTokens[playerIndex];
    newTokens[playerIndex] = token;
    setSelectedTokens(newTokens);
  };

  const canStart = names
    .slice(0, playerCount)
    .every((n) => n.trim().length > 0);

  return (
    <div className={styles.setup}>
      <div className={styles.title}>🎲 モノポ</div>
      <div className={styles.subtitle}>いっしょにあそぼう！</div>
      {onResume && savedGame && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '16px 24px',
            background: 'var(--color-bg-card, #f5f5f5)',
            borderRadius: 16,
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: 'var(--color-text-light)',
              marginBottom: 4,
            }}
          >
            {savedGame.players.map((p) => `${p.token} ${p.name}`).join('・')}
          </div>
          <Button size="large" onClick={onResume}>
            つづきからあそぶ
          </Button>
        </div>
      )}
      <div className={styles.playerCount}>
        <button
          className={styles.countButton}
          onClick={(e) => {
            if (playerCount <= MIN_PLAYERS) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setPlayerCount((c) => c - 1);
          }}
          aria-disabled={playerCount <= MIN_PLAYERS}
          aria-label="プレイヤーを減らす"
          aria-describedby={
            playerCount <= MIN_PLAYERS
              ? `${baseId}-min-players-desc`
              : undefined
          }
        >
          −
        </button>
        <span role="status">{playerCount}人であそぶ</span>
        <button
          className={styles.countButton}
          onClick={(e) => {
            if (playerCount >= MAX_PLAYERS) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setPlayerCount((c) => c + 1);
          }}
          aria-disabled={playerCount >= MAX_PLAYERS}
          aria-label="プレイヤーを増やす"
          aria-describedby={
            playerCount >= MAX_PLAYERS
              ? `${baseId}-max-players-desc`
              : undefined
          }
        >
          ＋
        </button>
      </div>
      {playerCount <= MIN_PLAYERS && (
        <span
          id={`${baseId}-min-players-desc`}
          className={styles.countDesc}
          role="status"
          aria-live="polite"
        >
          これ以上減らせません
        </span>
      )}
      {playerCount >= MAX_PLAYERS && (
        <span
          id={`${baseId}-max-players-desc`}
          className={styles.countDesc}
          role="status"
          aria-live="polite"
        >
          これ以上増やせません
        </span>
      )}
      <div className={styles.playerList}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div key={i} className={styles.playerRow}>
            <button
              className={styles.tokenButton}
              onClick={() => {
                const currentIdx = TOKENS.indexOf(
                  selectedTokens[i] as (typeof TOKENS)[number],
                );
                const nextToken = TOKENS[(currentIdx + 1) % TOKENS.length];
                handleTokenChange(i, nextToken);
              }}
              aria-label={`${names[i] || DEFAULT_NAMES[i]}のコマを変更する（現在のコマ: ${selectedTokens[i]}）`}
              title={`${names[i] || DEFAULT_NAMES[i]}のコマを変更する（現在のコマ: ${selectedTokens[i]}）`}
            >
              {selectedTokens[i]}
            </button>
            <input
              className={styles.nameInput}
              value={names[i]}
              onChange={(e) => handleNameChange(i, e.target.value)}
              placeholder={`プレイヤー${i + 1}のなまえ`}
              aria-label={`プレイヤー${i + 1}のなまえ（最大${MAX_NAME_LENGTH}文字）`}
              maxLength={MAX_NAME_LENGTH}
              aria-required="true"
              aria-invalid={names[i].trim().length === 0}
              aria-describedby={`${baseId}-char-count-${i}`}
            />
            <span
              id={`${baseId}-char-count-${i}`}
              className={styles.charCount}
              role="status"
            >
              {[...names[i]].length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        ))}
      </div>
      <div className={styles.subtitle}>
        アイコンをタップしてコマをえらべるよ
      </div>

      {/* P1 拡張: 機能トグル */}
      <fieldset className={styles.featureSection}>
        <legend className={styles.featureLegend}>🎓 つかえるあそびかた</legend>
        <p className={styles.featureHint}>
          オフのままなら、ふつうのモノポができるよ
        </p>
        {FEATURE_TOGGLES.map(({ key, label, description }) => {
          const checkboxId = `${baseId}-feature-${key}`;
          const descId = `${checkboxId}-desc`;
          const checked = features[key] === true;
          return (
            <label key={key} htmlFor={checkboxId} className={styles.featureRow}>
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={() => toggleFeature(key)}
                aria-describedby={descId}
              />
              <span className={styles.featureLabel}>{label}</span>
              <span id={descId} className={styles.featureDescription}>
                {description}
              </span>
            </label>
          );
        })}
      </fieldset>

      <Button
        size="large"
        className={styles.startButton}
        onClick={(e) => {
          if (!canStart) {
            e.preventDefault();
            return;
          }
          onStart(
            names.slice(0, playerCount),
            selectedTokens.slice(0, playerCount),
            features,
          );
        }}
        aria-disabled={!canStart}
        title={!canStart ? START_GUIDE_MSG : undefined}
        aria-describedby={!canStart ? 'start-hint' : undefined}
      >
        ゲームスタート！
      </Button>
      {!canStart && (
        <p
          id="start-hint"
          className={styles.startHint}
          role="status"
          aria-live="polite"
        >
          {START_GUIDE_MSG}
        </p>
      )}
    </div>
  );
}
