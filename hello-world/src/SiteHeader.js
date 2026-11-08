import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from './Brand';
import { colors, font } from './theme';

export function SiteHeader({ onHome, onAbout, onOffice, aboutActive }) {
  return (
    <View style={styles.bar}>
      <Brand onPress={onHome} />
      <View style={styles.links}>
        {onOffice ? (
          <Pressable onPress={onOffice}>
            <Text style={styles.about}>Back office</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onAbout}>
          <Text style={[styles.about, aboutActive && styles.aboutActive]}>About</Text>
        </Pressable>
      </View>
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
  links: { flexDirection: 'row', alignItems: 'center', gap: 18 },
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
