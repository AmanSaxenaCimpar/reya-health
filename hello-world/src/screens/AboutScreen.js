import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SiteHeader } from '../SiteHeader';
import { colors, font } from '../theme';

export function AboutScreen({ onHome }) {
  return (
    <View style={styles.page}>
      <SiteHeader onHome={onHome} onAbout={() => {}} aboutActive />
      <View style={styles.body}>
        <Pressable onPress={onHome}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>About Reya Health</Text>
        <Text style={styles.copy}>
          Reya Health is where companies register to offer Lab, Imaging, Psychiatry televisits, and
          Primary Care Televisit. Patients can search for care at home now. Service center booking
          is coming soon.
        </Text>
        <Text style={styles.copy}>info@reya.net</Text>
        <Text style={styles.copy}>(847) 423-5560</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.white,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 32,
    maxWidth: 720,
  },
  back: {
    fontFamily: font,
    color: colors.purple,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: font,
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
  },
  copy: {
    fontFamily: font,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginTop: 16,
  },
});
