import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from './Brand';
import { colors, font } from './theme';

export function SiteHeader({ onHome, onAbout, onOffice, onPortal, aboutActive, account, onSignOut }) {
  const initial = (account?.name || 'P').trim().charAt(0).toUpperCase();
  return (
    <View style={styles.bar}>
      <Brand onPress={onHome} />
      <View style={styles.links}>
        {account ? (
          <Pressable onPress={onPortal} style={styles.account}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.accountName}>{account.name}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onPortal}>
            <Text style={styles.about}>Sign in</Text>
          </Pressable>
        )}
        {onOffice ? (
          <Pressable onPress={onOffice}>
            <Text style={styles.about}>Back office</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onAbout}>
          <Text style={[styles.about, aboutActive && styles.aboutActive]}>About</Text>
        </Pressable>
        {account ? (
          <Pressable onPress={onSignOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        ) : null}
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
  links: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'flex-end' },
  about: { fontFamily: font, color: colors.purple, fontSize: 16, fontWeight: '600' },
  aboutActive: { borderBottomWidth: 2, borderBottomColor: colors.purple, paddingBottom: 2 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  accountName: { fontFamily: font, color: colors.ink, fontWeight: '700', fontSize: 15 },
  signOut: { fontFamily: font, color: colors.muted, fontWeight: '600', fontSize: 14 },
});
