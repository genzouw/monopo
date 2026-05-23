#!/usr/bin/env bun
/**
 * AI コーディングアシスタント向け設定ファイル同期スクリプト。
 *
 * マスタドキュメント `docs/ai-guidelines.md` から、各 AI ツールが要求する
 * 固定パスの設定ファイル（`.cursorrules` / `.github/copilot-instructions.md` など）
 * を生成します。各ツール固有のヘッダー（自動生成警告）を付与した上で本文を結合します。
 *
 * 使い方:
 *   bun run scripts/sync-ai-guidelines.ts            # 各ターゲットを書き込み
 *   bun run scripts/sync-ai-guidelines.ts --check    # CI 同期検証モード（書き込まず差分があれば非0終了）
 *
 * 新規 AI ツールへの対応:
 *   下記 `TARGETS` 配列に出力先を追加するだけで対応可能です。
 */

interface SyncTarget {
  name: string;
  dest: string;
}

const MASTER_PATH = 'docs/ai-guidelines.md';

const TARGETS: readonly SyncTarget[] = [
  { name: 'Cursor', dest: '.cursorrules' },
  { name: 'GitHub Copilot', dest: '.github/copilot-instructions.md' },
] as const;

const AUTO_GENERATED_HEADER = (toolName: string): string =>
  [
    '<!--',
    `  ⚠️ このファイルは自動生成されています。直接編集しないでください。`,
    `  対象ツール: ${toolName}`,
    `  マスタ: ${MASTER_PATH}`,
    `  同期: bun run sync:ai-guidelines`,
    '-->',
    '',
    '',
  ].join('\n');

/** マスタ本文と各ツール用ヘッダーから、ターゲットファイルに書き込む完全な文字列を生成する。 */
function buildContent(master: string, toolName: string): string {
  return `${AUTO_GENERATED_HEADER(toolName)}${master}`;
}

/** ファイルを読み込む。存在しない場合は空文字列を返す（--check モードで初回実行を許容するため）。 */
async function readFileOrEmpty(path: string): Promise<string> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return '';
  }
  return await file.text();
}

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');

  const masterFile = Bun.file(MASTER_PATH);
  if (!(await masterFile.exists())) {
    console.error(`❌ マスタファイルが見つかりません: ${MASTER_PATH}`);
    process.exit(1);
  }
  const master = await masterFile.text();

  const drift: string[] = [];

  for (const target of TARGETS) {
    const expected = buildContent(master, target.name);

    if (isCheck) {
      const actual = await readFileOrEmpty(target.dest);
      if (actual !== expected) {
        drift.push(target.dest);
        console.error(`❌ 同期ずれ検出: ${target.dest}`);
      } else {
        console.log(`✅ 同期OK: ${target.dest}`);
      }
    } else {
      await Bun.write(target.dest, expected);
      console.log(`✅ 生成: ${target.dest}`);
    }
  }

  if (isCheck && drift.length > 0) {
    console.error('');
    console.error('以下のファイルがマスタと同期されていません:');
    for (const path of drift) {
      console.error(`  - ${path}`);
    }
    console.error('');
    console.error('復旧手順:');
    console.error(`  1. ${MASTER_PATH} を確認・編集`);
    console.error('  2. ローカルで `bun run sync:ai-guidelines` を実行');
    console.error('  3. 生成された差分をコミットして再度プッシュ');
    process.exit(1);
  }
}

await main();
