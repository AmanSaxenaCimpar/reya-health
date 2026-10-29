import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, font } from '../theme';

/** Change this code anytime; share it only with people who should open the demo. */
export const ACCESS_CODE = 'REYA2026';

const STORAGE_KEY = 'reya_access_ok';

export function hasAccess() {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearAccess() {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AccessGate({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = code.trim();
    if (trimmed.toUpperCase() === ACCESS_CODE.toUpperCase()) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
      setError('');
      onUnlock();
      return;
    }
    setError('Wrong access code. Try again.');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.brand}>Reya Health</Text>
        <Text style={styles.title}>Private demo</Text>
        <Text style={styles.hint}>Enter the access code to continue.</Text>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setError('');
          }}
          onSubmitEditing={submit}
          placeholder="Access code"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#F7F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brand: {
    fontFamily: font,
    fontSize: 14,
    fontWeight: '700',
    color: colors.purple,
    marginBottom: 8,
  },
  title: {
    fontFamily: font,
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  hint: {
    fontFamily: font,
    fontSize: 15,
    color: colors.muted,
    marginBottom: 20,
  },
  input: {
    fontFamily: font,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 12,
  },
  error: {
    fontFamily: font,
    color: '#B91C1C',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: font,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
