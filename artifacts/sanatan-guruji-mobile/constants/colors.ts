/**
 * Tokens for the mobile portal wrapper.
 *
 * Derivation: the sibling web app (artifacts/sanatan-guruji) defines only
 * theme.json primary hsl(210, 40%, 50%) = #4d80b3 and radius 0.5rem (8px).
 * Its index.css declares no :root color variables, so every other token is
 * derived strictly from primary, white and black (alpha mixes only).
 */
const PRIMARY = '#4d80b3';
const WHITE = '#ffffff';
const BLACK = '#000000';

const colors = {
  light: {
    text: BLACK,
    tint: PRIMARY,
    background: WHITE,
    foreground: BLACK,
    card: WHITE,
    cardForeground: BLACK,
    primary: PRIMARY,
    primaryForeground: WHITE,
    secondary: 'rgba(77, 128, 179, 0.1)',
    secondaryForeground: PRIMARY,
    muted: 'rgba(77, 128, 179, 0.1)',
    mutedForeground: 'rgba(0, 0, 0, 0.6)',
    accent: 'rgba(77, 128, 179, 0.1)',
    accentForeground: PRIMARY,
    destructive: PRIMARY,
    destructiveForeground: WHITE,
    border: 'rgba(0, 0, 0, 0.1)',
    input: 'rgba(0, 0, 0, 0.1)',
  },
  radius: 8,
};

export default colors;
