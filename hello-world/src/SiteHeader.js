import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from './Brand';
import { colors, font } from './theme';

export function SiteHeader({ onHome, onAbout, aboutActive }) {
  return (
    <View style={styles.bar}>
      <Brand onPress={onHome} />
      <Pressable onPress={onAbout}>
        <Text style={[styles.about, aboutActive && styles.aboutActive]}>About</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  about: {
    fontFamily: font,
    color: colors.purple,
    fontSize: 16,
    fontWeight: '600',
  },
  aboutActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.purple,
    paddingBottom: 2,
  },
});
