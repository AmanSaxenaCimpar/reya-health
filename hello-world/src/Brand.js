import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { colors, font } from './theme';

const LOGO =
  'https://s43932.pcdn.co/wp-content/uploads/sites/213/2023/04/Reya_Final.png';

export function Brand({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.brand}>
      <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" />
      <Text style={styles.health}>Health</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 92,
    height: 44,
  },
  health: {
    fontFamily: font,
    color: colors.purple,
    fontSize: 22,
    fontWeight: '600',
  },
});
