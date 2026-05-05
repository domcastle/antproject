// constants.ts — 박성원 관리
// 공유 상수 절대 중복 선언 금지 (DEV_SPEC 6.4)

export const SILHOUETTE_COLORS: Record<number, string> = {
  1: "#3182f6",  // 발목
  2: "#54b8ff",  // 무릎
  3: "#8b95a1",  // 허리 (중립)
  4: "#ff8c42",  // 어깨
  5: "#ff4d4d",  // 머리
};

export const FEAR_GREED_COLORS: Record<string, string> = {
  extreme_fear:  "#0d47a1",
  fear:          "#1976d2",
  neutral:       "#fafafa",
  greed:         "#ffcc02",
  extreme_greed: "#ff4d4d",
};

export const BADGE_COLORS: Record<string, string> = {
  earnings: "#dbeafe",
  rate:     "#fef3c7",
  cpi:      "#fef9c3",
  witching: "#fee2e2",
};

export const BUFFETT_THRESHOLDS = {
  undervalued: 70,
  neutral:     100,
  overvalued:  150,
} as const;
