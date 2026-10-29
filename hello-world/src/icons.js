import { Text } from 'react-native';
import { colors } from './theme';

const glyphs = {
  menu: 'menu',
  pin: 'location_on',
  search: 'search',
  bill: 'receipt_long',
  chevron: 'chevron_right',
  locate: 'near_me',
  flask: 'science',
};

export function Icon({ name, size = 22, color = colors.purple }) {
  return (
    <Text
      style={{
        fontFamily: 'Material Icons',
        fontSize: size,
        color,
        lineHeight: size + 2,
      }}
    >
      {glyphs[name]}
    </Text>
  );
}
