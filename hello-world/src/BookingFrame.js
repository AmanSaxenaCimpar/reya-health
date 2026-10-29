import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from './theme';

export const HEALTHIE_EMBED_URL =
  'https://secure.gethealthie.com/appointments/embed_appt?dietitian_id=11341114&provider_ids=%5B11341114%5D&appt_type_ids=%5B499925,503525%5D&insurance_step=true';

function canEmbedHere() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  // Healthie CSP allows frame-ancestors: 'self' https:
  // so only HTTPS pages can show the iframe. http://localhost is blocked.
  return window.location.protocol === 'https:';
}

function openSecureWindow(src) {
  if (typeof window === 'undefined') {
    Linking.openURL(src);
    return null;
  }
  const width = Math.min(980, window.screen.availWidth - 40);
  const height = Math.min(860, window.screen.availHeight - 40);
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  return window.open(
    src,
    'reya-healthie-scheduler',
    `popup=yes,noopener,noreferrer,width=${width},height=${height},left=${left},top=${top}`
  );
}

export default function BookingFrame({ url, title }) {
  const src = url || HEALTHIE_EMBED_URL;
  const embedOk = canEmbedHere();
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (embedOk) {
      return undefined;
    }
    const popup = openSecureWindow(src);
    setOpened(Boolean(popup));
    return undefined;
  }, [embedOk, src]);

  function openScheduler() {
    const popup = openSecureWindow(src);
    setOpened(Boolean(popup));
  }

  if (embedOk) {
    return (
      <View style={styles.wrap}>
        <iframe
          title={title || 'MYGDA Appointment Scheduling'}
          src={src}
          allow="camera; microphone; fullscreen"
          style={{
            width: '100%',
            height: '800px',
            minHeight: '600px',
            border: 0,
            display: 'block',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Appointment scheduler</Text>
      <Text style={styles.copy}>
        Healthie only allows the booking form to be embedded on https pages. On local
        http://localhost it opens in a secure window instead, which is the same form.
      </Text>
      <Pressable onPress={openScheduler} style={styles.openButton}>
        <Text style={styles.openText}>
          {opened ? 'Reopen appointment scheduler' : 'Open appointment scheduler'}
        </Text>
      </Pressable>
      {opened ? (
        <Text style={styles.note}>The scheduler window is open. Keep it beside this page to finish booking.</Text>
      ) : (
        <Text style={styles.note}>If nothing opened, your browser blocked the popup. Use the blue button.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    minHeight: 800,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  panel: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 14,
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontFamily: font,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  copy: {
    fontFamily: font,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  openButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  openText: {
    fontFamily: font,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  note: {
    fontFamily: font,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
