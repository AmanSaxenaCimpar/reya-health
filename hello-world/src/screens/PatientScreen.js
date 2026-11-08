import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  API_URL,
  patientDocument,
  patientLogin,
  patientMessage,
  patientSignup,
  patientVisits,
} from '../api';
import { SiteHeader } from '../SiteHeader';
import { colors, font, money } from '../theme';

const TOKEN_KEY = 'reya_patient_token';

export function patientToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function storeToken(token) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function PatientScreen({ visit, onHome, onAbout, onOffice, onBook }) {
  const [token, setToken] = useState(patientToken);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [account, setAccount] = useState(null);
  const [visits, setVisits] = useState([]);
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    patientVisits(token)
      .then((payload) => {
        setAccount({ name: payload.name, email: payload.email });
        setVisits(payload.visits || []);
        if (visit) {
          onBook(visit);
        }
      })
      .catch(() => {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
      });
  }, [token]);

  async function submit() {
    setError('');
    try {
      const result =
        mode === 'signup'
          ? await patientSignup({ name, email, password })
          : await patientLogin(email, password);
      storeToken(result.token);
      setToken(result.token);
    } catch (err) {
      setError(err.message);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setAccount(null);
    setVisits([]);
    setSelected('');
  }

  async function refresh() {
    const payload = await patientVisits(token);
    setVisits(payload.visits || []);
  }

  async function upload(visitId) {
    const file = await pickFile();
    if (!file) {
      return;
    }
    await patientDocument(token, { visit_id: visitId, ...file });
    await refresh();
    setNotice('Document added to this visit.');
  }

  async function send(visitId) {
    if (!note.trim()) {
      return;
    }
    await patientMessage(token, visitId, note.trim());
    setNote('');
    await refresh();
  }

  const current = visits.find((item) => item.id === selected);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={onHome} onAbout={onAbout} onOffice={onOffice} />
      <View style={styles.body}>
        <Text style={styles.title}>Patient portal</Text>
        {!token || !account ? (
          <View style={styles.panel}>
            <Text style={styles.copy}>
              {visit
                ? 'Sign in to book this visit. Your order, uploads, and messages stay on this account.'
                : 'Sign in to see your orders, uploads, results, and messages.'}
            </Text>
            <View style={styles.tabs}>
              {[
                ['signin', 'Sign in'],
                ['signup', 'Sign up'],
              ].map(([key, label]) => (
                <Pressable key={key} onPress={() => setMode(key)} style={[styles.tab, mode === key && styles.tabOn]}>
                  <Text style={[styles.tabText, mode === key && styles.tabTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {mode === 'signup' ? <Field label="Name" value={name} onChangeText={setName} /> : null}
            <Field label="Email" value={email} autoCapitalize="none" onChangeText={setEmail} />
            <Field label="Password" value={password} secureTextEntry onChangeText={setPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={submit} style={styles.button}>
              <Text style={styles.buttonText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={styles.testHead}>
              <View style={styles.grow}>
                <Text style={styles.heading}>{account.name}</Text>
                <Text style={styles.copy}>{account.email}</Text>
              </View>
              <Pressable onPress={signOut} style={styles.quiet}>
                <Text style={styles.quietText}>Sign out</Text>
              </Pressable>
            </View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Text style={styles.copy}>
              Orders and files you add are visible to the care team for that visit. Results appear here when the care team adds them.
            </Text>
            {!visits.length ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>No visits yet</Text>
                <Text style={styles.copy}>Book a test while signed in. The order will show up here.</Text>
              </View>
            ) : null}
            {visits.map((item) => (
              <Pressable key={item.id} onPress={() => setSelected(item.id === selected ? '' : item.id)} style={styles.panel}>
                <Text style={styles.panelTitle}>{item.company || 'Visit'}</Text>
                <Text style={styles.copy}>
                  {item.appointment_date} {item.appointment_time}
                </Text>
                <Text style={styles.meta}>{(item.tests || []).join(', ') || 'No tests listed'} · Total {money(item.total)}</Text>
              </Pressable>
            ))}
            {current ? (
              <VisitDetail
                visit={current}
                note={note}
                onNote={setNote}
                onUpload={() => upload(current.id)}
                onSend={() => send(current.id)}
              />
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function VisitDetail({ visit, note, onNote, onUpload, onSend }) {
  const orders = (visit.documents || []).filter((item) => item.kind === 'order');
  const uploads = (visit.documents || []).filter((item) => item.kind === 'document');
  const results = (visit.documents || []).filter((item) => item.kind === 'result');
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>This visit</Text>
      <Text style={styles.meta}>{visit.order_source === 'uploaded' ? 'You uploaded the order.' : 'Reya created the order.'}</Text>
      <FileList title="Order" files={orders} />
      <FileList title="Your documents" files={uploads} empty="No extra documents yet." />
      <Pressable onPress={onUpload} style={styles.ghost}>
        <Text style={styles.ghostText}>Upload a PDF or image</Text>
      </Pressable>
      <FileList title="Results" files={results} empty="Results will appear here when they are returned." />
      <Text style={styles.subheading}>Messages</Text>
      {(visit.messages || []).map((message) => (
        <View key={message.id} style={styles.message}>
          <Text style={styles.meta}>{message.author} · {message.created}</Text>
          <Text style={styles.copy}>{message.body}</Text>
        </View>
      ))}
      <Field label="Message the care team" value={note} multiline onChangeText={onNote} />
      <Pressable onPress={onSend} style={styles.button}>
        <Text style={styles.buttonText}>Send message</Text>
      </Pressable>
    </View>
  );
}

function FileList({ title, files, empty }) {
  return (
    <View style={styles.block}>
      <Text style={styles.subheading}>{title}</Text>
      {!files.length && empty ? <Text style={styles.meta}>{empty}</Text> : null}
      {files.map((file) => (
        <Pressable
          key={file.id}
          onPress={() => window.open(fileLink(file), '_blank', 'noopener')}
          style={styles.linkRow}
        >
          <Text style={styles.link}>{file.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function fileLink(file) {
  if (file.kind === 'order' && file.order_id) {
    return `${API_URL}/orders/${file.order_id}`;
  }
  const token = patientToken();
  return `${API_URL}/patient/files/${file.id}?token=${encodeURIComponent(token)}`;
}

function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/jpeg,image/png,image/webp,image/gif,image/heic';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve({
          name: file.name,
          content_type: file.type || 'application/octet-stream',
          content: result.includes(',') ? result.split(',')[1] : '',
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.inputShort]} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F3F8' },
  content: { paddingBottom: 64 },
  body: { maxWidth: 880, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28 },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  heading: { fontFamily: font, fontSize: 26, fontWeight: '700', color: colors.ink },
  panel: { marginTop: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20 },
  panelTitle: { fontFamily: font, fontSize: 18, fontWeight: '700', color: colors.ink },
  subheading: { fontFamily: font, fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 16 },
  copy: { fontFamily: font, color: colors.muted, marginTop: 6, lineHeight: 22, fontSize: 14 },
  meta: { fontFamily: font, color: colors.muted, fontSize: 12, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white },
  tabOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  tabText: { fontFamily: font, color: colors.ink, fontWeight: '600' },
  tabTextOn: { color: colors.white },
  field: { marginTop: 12 },
  label: { fontFamily: font, fontWeight: '600', color: colors.ink, fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font, fontSize: 15, color: colors.ink, backgroundColor: '#FCFBFD', outlineStyle: 'none' },
  inputShort: { minHeight: 72, textAlignVertical: 'top' },
  button: { marginTop: 14, alignSelf: 'flex-start', backgroundColor: colors.purple, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  ghost: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  ghostText: { fontFamily: font, color: colors.ink, fontWeight: '700' },
  quiet: { padding: 8 },
  quietText: { fontFamily: font, color: colors.purple, fontWeight: '700' },
  error: { fontFamily: font, color: '#B42318', marginTop: 10 },
  notice: { fontFamily: font, color: colors.ink, marginTop: 16, backgroundColor: '#EFE7F6', borderRadius: 12, padding: 12 },
  testHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 },
  grow: { flex: 1 },
  block: { marginTop: 8 },
  linkRow: { marginTop: 8 },
  link: { fontFamily: font, color: colors.purple, fontWeight: '700' },
  message: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
});
