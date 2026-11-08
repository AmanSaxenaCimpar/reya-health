import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  API_URL,
  patientDocument,
  patientLogin,
  patientMessage,
  patientResend,
  patientVerify,
  patientProfile,
  patientRead,
  patientSignup,
  patientVisits,
} from '../api';
import { SiteHeader } from '../SiteHeader';
import { checkEmail, checkName, profileProblems } from '../checks';
import { colors, font, money } from '../theme';

const TOKEN_KEY = 'reya_patient_token';
const NAME_KEY = 'reya_patient_name';

export function patientToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function patientName() {
  try {
    return window.sessionStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function rememberPatient(result) {
  window.sessionStorage.setItem(TOKEN_KEY, result.token);
  window.sessionStorage.setItem(NAME_KEY, result.name || '');
}

export function forgetPatient() {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(NAME_KEY);
}

const NAV = [
  ['messages', 'Messages'],
  ['contact', 'Contact details'],
  ['pharmacy', 'Pharmacy'],
  ['orders', 'Orders'],
  ['results', 'Results'],
  ['notes', "Doctor's notes"],
];

const emptyProfile = {
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  dob: '',
  pharmacy_name: '',
  pharmacy_phone: '',
  pharmacy_address: '',
};

export function PatientScreen({ visit, onHome, onAbout, onBook, account, onAccount, onSignOut }) {
  const [token, setToken] = useState(patientToken);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState('');
  const [profile, setProfile] = useState(emptyProfile);
  const [savedEmail, setSavedEmail] = useState('');
  const [visits, setVisits] = useState([]);
  const [section, setSection] = useState('orders');
  const [unread, setUnread] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('verify');
    if (!code) {
      return;
    }
    patientVerify(code)
      .then(() => {
        setConfirmed(true);
        setMode('signin');
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    patientVisits(token)
      .then((payload) => {
        applyPayload(payload);
        if (visit) {
          onBook(visit);
        }
      })
      .catch(() => {
        forgetPatient();
        setToken('');
        onAccount(null);
      });
  }, [token]);

  function applyPayload(payload) {
    setSavedEmail(payload.email || '');
    setProfile({ ...emptyProfile, ...payload });
    setVisits(payload.visits || []);
    setUnread(payload.unread || 0);
    onAccount({ name: payload.name, email: payload.email });
  }

  async function submit() {
    setError('');
    if (mode === 'signup') {
      const nameError = checkName(name, 'full name');
      if (nameError) {
        setError(nameError);
        return;
      }
    }
    const emailError = checkEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    try {
      if (mode === 'signup') {
        const result = await patientSignup({ name, email, password });
        setPendingEmail(email.trim());
        setPreviewLink(result.preview_link || '');
        setPassword('');
        return;
      }
      const result = await patientLogin(email, password);
      rememberPatient(result);
      onAccount({ name: result.name, email: result.email });
      setToken(result.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function refresh() {
    applyPayload(await patientVisits(token));
  }

  async function openMessages() {
    setSection('messages');
    if (!unread) {
      return;
    }
    applyPayload(await patientRead(token));
  }

  async function saveProfile() {
    const problem = Object.values(profileProblems(profile)).find(Boolean);
    if (problem) {
      setFormError(problem);
      setNotice('');
      return;
    }
    setFormError('');
    applyPayload(await patientProfile(token, profile));
    setNotice('Saved.');
  }

  async function upload(visitId) {
    const file = await pickFile();
    if (!file) {
      return;
    }
    await patientDocument(token, { visit_id: visitId, ...file });
    await refresh();
    setNotice('Document added to this order.');
  }

  async function send(visitId, text) {
    await patientMessage(token, visitId, text);
    await refresh();
  }

  const header = (
    <SiteHeader onHome={onHome} onAbout={onAbout} onPortal={() => {}} account={account} onSignOut={onSignOut} />
  );

  if (!token) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {header}
        <View style={styles.authWrap}>
          <View style={styles.authCard}>
            <Text style={styles.title}>{pendingEmail ? 'Confirm your email' : mode === 'signup' ? 'Create your account' : 'Sign in'}</Text>
            <Text style={styles.copy}>
              {confirmed
                ? 'Your email is confirmed. Sign in to open the portal.'
                : pendingEmail
                  ? `Open the confirmation link sent to ${pendingEmail}. The portal stays closed until that email is confirmed.`
                  : visit
                    ? 'Sign in to continue this booking. Your name stays on the screen while you book.'
                    : 'Your orders, results, messages, and pharmacy details live here.'}
            </Text>
            {pendingEmail ? (
              <View>
                {previewLink ? (
                  <Text style={styles.copy}>
                    Mail is not connected on this server yet, so the link is shown here. Once mail is connected, this link is only emailed.
                  </Text>
                ) : null}
                {previewLink ? (
                  <Pressable onPress={() => window.location.assign(previewLink)} style={styles.button}>
                    <Text style={styles.buttonText}>Open confirmation link</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={async () => {
                    const result = await patientResend(pendingEmail);
                    setPreviewLink(result.preview_link || '');
                    setError('');
                  }}
                  style={styles.ghost}
                >
                  <Text style={styles.ghostText}>Send the email again</Text>
                </Pressable>
                <Pressable onPress={() => { setPendingEmail(''); setMode('signin'); }} style={styles.ghost}>
                  <Text style={styles.ghostText}>Back to sign in</Text>
                </Pressable>
              </View>
            ) : null}
            {!pendingEmail ? (
              <View>
                <View style={styles.segment}>
                  {[
                    ['signin', 'Sign in'],
                    ['signup', 'Sign up'],
                  ].map(([key, label]) => (
                    <Pressable key={key} onPress={() => setMode(key)} style={[styles.segmentItem, mode === key && styles.segmentOn]}>
                      <Text style={[styles.segmentText, mode === key && styles.segmentTextOn]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {mode === 'signup' ? <Field label="Full name" value={name} onChangeText={setName} /> : null}
                <Field label="Email" value={email} autoCapitalize="none" onChangeText={setEmail} />
                <Field label="Password" value={password} secureTextEntry placeholder="At least 8 characters" onChangeText={setPassword} />
                <Pressable onPress={submit} style={styles.button}>
                  <Text style={styles.buttonText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
                </Pressable>
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={onHome} style={styles.ghost}>
              <Text style={styles.ghostText}>Home</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {header}
      <View style={styles.shell}>
        <View style={styles.nav}>
          <Pressable onPress={onHome} style={styles.navItem}>
            <Text style={styles.navText}>Home</Text>
          </Pressable>
          <Text style={styles.navTitle}>Your care</Text>
          {NAV.map(([key, label]) => (
            <Pressable key={key} onPress={() => (key === 'messages' ? openMessages() : setSection(key))} style={[styles.navItem, section === key && styles.navOn]}>
              <Text style={[styles.navText, section === key && styles.navTextOn]}>{label}</Text>
              {key === 'messages' && unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
        <View style={styles.main}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          {section === 'messages' ? <Messages visits={visits} onSend={send} /> : null}
          {section === 'contact' ? (
            <ProfileCard
              title="Contact details"
              copy="This is the address and phone the care team uses for this account."
              onSave={saveProfile}
            >
              <Field label="Email" value={savedEmail} editable={false} />
              <Field label="Phone" value={profile.phone} onChangeText={(phone) => setProfile({ ...profile, phone })} />
              <Field label="Date of birth" value={profile.dob} placeholder="mm/dd/yyyy" onChangeText={(dob) => setProfile({ ...profile, dob })} />
              <Field label="Street address" value={profile.address} onChangeText={(address) => setProfile({ ...profile, address })} />
              <View style={styles.row}>
                <Field label="City" value={profile.city} onChangeText={(city) => setProfile({ ...profile, city })} />
                <Field label="State" value={profile.state} onChangeText={(state) => setProfile({ ...profile, state })} />
                <Field label="ZIP" value={profile.zip} onChangeText={(zip) => setProfile({ ...profile, zip })} />
              </View>
            </ProfileCard>
          ) : null}
          {section === 'pharmacy' ? (
            <ProfileCard title="Pharmacy" copy="Where prescriptions should be sent when a visit needs one." onSave={saveProfile}>
              <Field label="Pharmacy name" value={profile.pharmacy_name} onChangeText={(pharmacy_name) => setProfile({ ...profile, pharmacy_name })} />
              <Field label="Pharmacy phone" value={profile.pharmacy_phone} onChangeText={(pharmacy_phone) => setProfile({ ...profile, pharmacy_phone })} />
              <Field label="Pharmacy address" value={profile.pharmacy_address} onChangeText={(pharmacy_address) => setProfile({ ...profile, pharmacy_address })} />
            </ProfileCard>
          ) : null}
          {section === 'orders' ? <Orders visits={visits} onUpload={upload} /> : null}
          {section === 'results' ? <Results visits={visits} /> : null}
          {section === 'notes' ? <Notes visits={visits} /> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function Messages({ visits, onSend }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Messages</Text>
      <Text style={styles.copy}>A new message from the care team shows as a gray number on Messages.</Text>
      {!visits.length ? <Text style={styles.meta}>Book a visit to start a conversation.</Text> : null}
      {visits.map((item) => (
        <Thread key={item.id} item={item} onSend={onSend} />
      ))}
    </View>
  );
}

function Thread({ item, onSend }) {
  const [note, setNote] = useState('');
  return (
    <View style={styles.thread}>
      <Text style={styles.subheading}>{item.company || 'Visit'} · {item.appointment_date}</Text>
      {(item.messages || []).length ? null : <Text style={styles.meta}>No messages yet.</Text>}
      {(item.messages || []).map((message) => (
        <View key={message.id} style={[styles.bubble, message.by === 'office' ? styles.bubbleOffice : styles.bubbleMine]}>
          <Text style={styles.meta}>{message.author} · {message.created}</Text>
          <Text style={styles.copy}>{message.body}</Text>
        </View>
      ))}
      <Field label="Write a message" value={note} multiline onChangeText={setNote} />
      <Pressable
        onPress={() => {
          if (!note.trim()) {
            return;
          }
          const text = note.trim();
          setNote('');
          onSend(item.id, text);
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Send</Text>
      </Pressable>
    </View>
  );
}

function Orders({ visits, onUpload }) {
  return (
    <View>
      <Text style={styles.panelTitle}>Orders</Text>
      {!visits.length ? (
        <View style={styles.panel}>
          <Text style={styles.copy}>No orders yet. Book a test while you are signed in and it will appear here.</Text>
        </View>
      ) : null}
      {visits.map((item) => {
        const orders = (item.documents || []).filter((file) => file.kind === 'order');
        const uploads = (item.documents || []).filter((file) => file.kind === 'document');
        return (
          <View key={item.id} style={styles.panel}>
            <Text style={styles.panelTitle}>{item.company || 'Visit'}</Text>
            <Text style={styles.copy}>{item.appointment_date} {item.appointment_time}</Text>
            <Text style={styles.meta}>{(item.tests || []).join(', ') || 'No tests listed'} · Total {money(item.total)}</Text>
            <Text style={styles.meta}>{item.order_source === 'uploaded' ? 'You uploaded this order.' : 'Reya created this order.'}</Text>
            <FileList title="Order" files={orders} />
            <FileList title="Documents you added" files={uploads} empty="No extra documents yet." />
            <Pressable onPress={() => onUpload(item.id)} style={styles.ghost}>
              <Text style={styles.ghostText}>Upload a PDF or image</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function Results({ visits }) {
  const rows = visits.flatMap((item) =>
    (item.documents || []).filter((file) => file.kind === 'result').map((file) => ({ ...file, visit: item.company, when: item.appointment_date }))
  );
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Results</Text>
      <Text style={styles.copy}>Results show up here after the care team adds them to your visit.</Text>
      {!rows.length ? <Text style={styles.meta}>No results yet.</Text> : null}
      {rows.map((file) => (
        <Pressable key={file.id} onPress={() => window.open(fileLink(file), '_blank', 'noopener')} style={styles.linkRow}>
          <Text style={styles.link}>{file.name}</Text>
          <Text style={styles.meta}>{file.visit} · {file.when}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Notes({ visits }) {
  const rows = visits.flatMap((item) => (item.notes || []).map((note) => ({ ...note, visit: item.company })));
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Doctor's notes</Text>
      <Text style={styles.copy}>Notes from the care team for your visits.</Text>
      {!rows.length ? <Text style={styles.meta}>No notes yet.</Text> : null}
      {rows.map((note) => (
        <View key={note.id} style={styles.thread}>
          <Text style={styles.meta}>{note.visit} · {note.author} · {note.created}</Text>
          <Text style={styles.copy}>{note.body}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileCard({ title, copy, onSave, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      {children}
      <Pressable onPress={onSave} style={styles.button}>
        <Text style={styles.buttonText}>Save</Text>
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
        <Pressable key={file.id} onPress={() => window.open(fileLink(file), '_blank', 'noopener')} style={styles.linkRow}>
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
  return `${API_URL}/patient/files/${file.id}?token=${encodeURIComponent(patientToken())}`;
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
  page: { flex: 1, backgroundColor: '#F4F1F6' },
  content: { paddingBottom: 48 },
  authWrap: { alignItems: 'center', padding: 24 },
  authCard: { width: '100%', maxWidth: 460, marginTop: 28, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 28 },
  title: { fontFamily: font, fontSize: 30, fontWeight: '700', color: colors.ink },
  shell: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', maxWidth: 1100, width: '100%', alignSelf: 'center', padding: 20, gap: 16 },
  nav: { width: 240, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12 },
  navTitle: { fontFamily: font, fontWeight: '700', color: colors.muted, fontSize: 12, letterSpacing: 0.4, paddingHorizontal: 10, paddingVertical: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  navOn: { backgroundColor: '#EFE7F6' },
  navText: { fontFamily: font, color: colors.ink, fontWeight: '600', fontSize: 15 },
  navTextOn: { color: colors.purple },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#D0D0D0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: font, color: '#333', fontSize: 12, fontWeight: '700' },
  main: { flexGrow: 1, flexBasis: 320, minWidth: 280 },
  panel: { marginTop: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20 },
  panelTitle: { fontFamily: font, fontSize: 22, fontWeight: '700', color: colors.ink },
  subheading: { fontFamily: font, fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 14 },
  copy: { fontFamily: font, color: colors.ink, marginTop: 6, lineHeight: 22, fontSize: 14 },
  meta: { fontFamily: font, color: colors.muted, fontSize: 12, marginTop: 4 },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', marginTop: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white },
  segmentOn: { backgroundColor: colors.purple },
  segmentText: { fontFamily: font, color: colors.ink, fontWeight: '600' },
  segmentTextOn: { color: colors.white },
  field: { marginTop: 12, flexGrow: 1, minWidth: 120 },
  label: { fontFamily: font, fontWeight: '600', color: colors.ink, fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font, fontSize: 15, color: colors.ink, backgroundColor: '#FCFBFD', outlineStyle: 'none' },
  inputShort: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.purple, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  ghost: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white },
  ghostText: { fontFamily: font, color: colors.ink, fontWeight: '700' },
  error: { fontFamily: font, color: '#B42318', marginTop: 10 },
  notice: { fontFamily: font, color: colors.ink, backgroundColor: '#EFE7F6', borderRadius: 12, padding: 12, marginBottom: 8 },
  block: { marginTop: 8 },
  linkRow: { marginTop: 10 },
  link: { fontFamily: font, color: colors.purple, fontWeight: '700' },
  thread: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  bubble: { marginTop: 8, borderRadius: 12, padding: 12 },
  bubbleMine: { backgroundColor: '#F6F3F8' },
  bubbleOffice: { backgroundColor: '#EEF3FB' },
});
