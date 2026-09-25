export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 日本語の subject を許容する（genzouw/trim-text の .commitlintrc.json と同じ）
    'subject-case': [0],
    // Renovate や AI エージェントが生成する本文は長い URL を含み 100 文字を超えるため無効化する
    'body-max-line-length': [0],
  },
};
