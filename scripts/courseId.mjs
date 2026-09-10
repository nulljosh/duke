// Extracted from run.mjs so it's testable without importing the whole runner
// (which launches a real browser at module load time).
export const courseIdFor = t => ({
  math: 'MATH_BT', chess: 'CHESS_CH', music: 'MUSIC_MU',
  zh: 'DUOLINGO_ZH-CN_EN', nl: 'DUOLINGO_NL-NL_EN',
}[t] || ('DUOLINGO_' + t.toUpperCase() + '_EN'));
