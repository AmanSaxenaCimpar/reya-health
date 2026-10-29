import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BookingFrame, { HEALTHIE_EMBED_URL } from '../BookingFrame';
import { SiteHeader } from '../SiteHeader';
import { colors, font, serviceLabels } from '../theme';

export function VisitScreen({ visit, onHome, onAbout, onBack }) {
  const title = visit?.company || serviceLabels[visit?.service] || 'Book visit';
  const url = visit?.url || HEALTHIE_EMBED_URL;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={onHome} onAbout={onAbout} />
      <View style={styles.body}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>
          Schedule your visit below
          {visit?.zip ? ` for ZIP ${visit.zip}` : ''}.
        </Text>
        <BookingFrame url={url} title="MYGDA Appointment Scheduling" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingBottom: 48,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    fontFamily: font,
    color: colors.purple,
    fontWeight: '700',
    fontSize: 16,
  },
  title: {
    fontFamily: font,
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 16,
  },
  copy: {
    fontFamily: font,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 16,
  },
});
