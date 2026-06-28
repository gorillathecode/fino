// FINO Design System
// Strict token set - do not introduce new colors or styles

export const colors = {
  navy: '#0B1736',
  deepNavy: '#071126',
  cyan: '#10BFE8',
  turquoise: '#12D6C5',
  offWhite: '#F7FAFC',
  cardWhite: '#FFFFFF',
  textDark: '#101B3D',
  textMuted: '#667085',
  border: '#E4EAF2',

  // semantic (used sparingly)
  successBg: '#E1F5EE',
  successText: '#0F6E56',
  warningBg: '#FFF8EC',
  warningBorder: '#FAE3B5',
  warningText: '#854F0B',
  warningTextDark: '#633806',
  dangerBg: '#FCEBEB',
  dangerText: '#A32D2D',

  // tab inactive
  tabInactive: '#B4C2D6',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  hero: { fontSize: 38, fontWeight: '700' as const, color: colors.textDark },
  sectionTitle: { fontSize: 28, fontWeight: '700' as const, color: colors.textDark },
  cardTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.textDark },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.textDark },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, color: colors.textDark },
  label: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  small: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
};

export const shadow = {
  card: {
    shadowColor: '#0B1736',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 4,
  },
  subtle: {
    shadowColor: '#0B1736',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
};

export const cardPadding = 24;
