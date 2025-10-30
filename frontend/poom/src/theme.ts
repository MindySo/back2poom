export const typography = {
  fontFamily: {
    primary: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
  },

  // 폰트 웨이트 (Pretendard는 9가지 웨이트 제공)
  fontWeight: {
    thin: 100,
    extraLight: 200,
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
  },

  // 텍스트 크기 (피그마 이미지의 XL, LG, MD, SM 기준)
  fontSize: {
    xs: '12px',
    sm: '14px', // SM: 14px
    md: '16px',
    lg: '18px', // MD: 18px
    xl: '20px', // LG: 20px
    xxl: '24px',
    xxxl: '28px', // XL: 28px
    display: '32px',
    hero: '40px',
  },

  // 라인 높이
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // 텍스트 스타일 조합 (H1~Body 계층)
  textStyles: {
    h1: {
      fontSize: '28px', // XXXL
      fontWeight: 700, // Bold
      lineHeight: 1.2,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    h2: {
      fontSize: '24px', // XXL
      fontWeight: 700,
      lineHeight: 1.3,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    h3: {
      fontSize: '20px', // XL
      fontWeight: 600,
      lineHeight: 1.4,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    h4: {
      fontSize: '18px', // LG
      fontWeight: 600,
      lineHeight: 1.4,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    body: {
      fontSize: '16px', // MD
      fontWeight: 400,
      lineHeight: 1.6,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    bodySmall: {
      fontSize: '14px', // SM
      fontWeight: 400,
      lineHeight: 1.5,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
    caption: {
      fontSize: '12px', // XS
      fontWeight: 400,
      lineHeight: 1.4,
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    },
  },
} as const;

export const colors = {
  darkMain: '#2B3A55',
  main: '#E89A59',
  beige: '#F6F4EF',
  lightGray: '#EEF1F6',
  black: '#333333',
  gray: '#767676',
  white: '#FFFFFF',

  rainbow: 'conic-gradient(from 0deg, #FF7C7E, #FFAE7C, #FFE97C, #7CFF80, #7CC4FF, #A37CFF, #D17CF8, #FF7C7E)',

  blue: '#3A6EA5',
  pink: '#D9A7A0',
  green: '#8EB69B',
  yellow: '#F6C90E',

} as const;

// 스페이싱 토큰
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
  xxxxl: '40px',
} as const;

// 보더 반지름 토큰
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '20px',
  full: '9999px',
} as const;

// 전역 테마 객체
export const theme = {
  typography,
  colors,
  spacing,
  borderRadius,
} as const;

// 타입 정의
export type Typography = typeof typography;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Theme = typeof theme;

export default theme;
