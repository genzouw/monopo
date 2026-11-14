/**
 * テスト専用の補助関数。
 *
 * `noUncheckedIndexedAccess` の下では、配列の添字やレコードのキーで取り出した値の型に
 * `undefined` が含まれる。テストの事前準備で使う値は存在する前提なので、ここで取り出し、
 * 存在しなければ原因が分かるメッセージで例外を投げてテストを失敗させる。
 */

/**
 * 配列（または配列風オブジェクト）から指定位置の要素を取り出す。
 *
 * @param items - 取り出し元の配列
 * @param index - 要素の位置（0 始まり）
 * @returns 指定位置の要素
 * @throws {Error} 指定位置に要素がないとき
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(
      `位置 ${index} に要素がありません（要素数: ${items.length}）`,
    );
  }
  return item;
}

/**
 * レコードから指定キーの値を取り出す。
 *
 * @param record - 取り出し元のレコード
 * @param key - キー
 * @returns 指定キーの値
 * @throws {Error} 指定キーに値がないとき
 */
export function valueOf<T>(record: Record<string, T>, key: string): T {
  const value = record[key];
  if (value === undefined) {
    throw new Error(`キー ${key} に値がありません`);
  }
  return value;
}
