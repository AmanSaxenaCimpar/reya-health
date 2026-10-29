export const colors = {
  purple: '#6D4299',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  ink: '#1F0C20',
  white: '#FFFFFF',
  line: '#E6E6E6',
  muted: '#5C5C5C',
};

export const serviceLabels = {
  lab: 'Lab',
  imaging: 'Imaging',
  psych: 'Psychiatry televisits',
  primary: 'Primary Care Televisit',
};

export const font = 'Poppins, sans-serif';

export function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}
