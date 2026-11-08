import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  inviteLogin,
  officeCatalog,
  officeLogin,
  registerBusiness,
  savePrice,
  saveTransport,
} from '../api';
import { SiteHeader } from '../SiteHeader';
import { colors, font, money } from '../theme';

const TOKEN_KEY = 'reya_office_token';

export function AdminScreen({ onHome, onAbout }) {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState(null);
  const [rule, setRule] = useState({ base_fee: '', included_miles: '', per_mile: '' });
  const [business, setBusiness] = useState({ name: '', email: '', lab: true, imaging: false });
  const [invite, setInvite] = useState({ name: '', email: '', role: 'provider' });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    officeCatalog(token)
      .then((payload) => {
        setCatalog(payload);
        setRule({
          base_fee: String(payload.transport.base_fee),
          included_miles: String(payload.transport.included_miles),
          per_mile: String(payload.transport.per_mile),
        });
      })
      .catch((err) => {
        setToken('');
        window.sessionStorage.removeItem(TOKEN_KEY);
        setError(err.message);
      });
  }, [token]);

  async function signIn() {
    setError('');
    try {
      const result = await officeLogin(email, password);
      window.sessionStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveRule() {
    setNotice('');
    const saved = await saveTransport(token, {
      base_fee: Number(rule.base_fee),
      included_miles: Number(rule.included_miles),
      per_mile: Number(rule.per_mile),
    });
    setNotice(
      `Transportation saved. At ${saved.example.miles} miles the fee is ${money(saved.example.total)}.`
    );
  }

  async function updatePrice(code, price) {
    await savePrice(token, code, Number(price));
    setCatalog((current) => ({
      ...current,
      tests: current.tests.map((item) => (item.code === code ? { ...item, price: Number(price) } : item)),
    }));
  }

  async function addBusiness() {
    const services = [business.lab ? 'lab' : '', business.imaging ? 'imaging' : ''].filter(Boolean);
    const created = await registerBusiness(token, {
      name: business.name,
      email: business.email,
      services,
    });
    setCatalog((current) => ({ ...current, businesses: [...current.businesses, created] }));
    setBusiness({ name: '', email: '', lab: true, imaging: false });
    setNotice(`${created.name} is now a bookable business.`);
  }

  async function sendInvite() {
    const result = await inviteLogin(token, invite);
    setNotice(
      result.emailed
        ? `Login email sent to ${result.email}.`
        : `Login created for ${result.email}. Temporary password: ${result.temporary_password}`
    );
    setInvite({ name: '', email: '', role: 'provider' });
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={onHome} onAbout={onAbout} />
      <View style={styles.body}>
        <Text style={styles.title}>Back office</Text>
        {!token || !catalog ? (
          <View style={styles.card}>
            <Text style={styles.copy}>Sign in with the office account. This is separate from the old portal.</Text>
            <Field label="Email" value={email} onChangeText={setEmail} />
            <Field label="Password" value={password} secureTextEntry onChangeText={setPassword} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable onPress={signIn} style={styles.button}>
              <Text style={styles.buttonText}>Sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <Text style={styles.heading}>Transportation fee</Text>
            <Text style={styles.copy}>
              The base fee is always charged. After the included miles, each extra mile adds the per-mile amount.
            </Text>
            <Field label="Base fee ($)" value={rule.base_fee} onChangeText={(base_fee) => setRule({ ...rule, base_fee })} />
            <Field
              label="Included miles"
              value={rule.included_miles}
              onChangeText={(included_miles) => setRule({ ...rule, included_miles })}
            />
            <Field label="Amount per extra mile ($)" value={rule.per_mile} onChangeText={(per_mile) => setRule({ ...rule, per_mile })} />
            <Pressable onPress={saveRule} style={styles.button}>
              <Text style={styles.buttonText}>Save transportation rule</Text>
            </Pressable>

            <Text style={styles.heading}>Test rates</Text>
            {catalog.tests.map((item) => (
              <PriceRow key={item.code} item={item} onSave={updatePrice} />
            ))}

            <Text style={styles.heading}>Register a business</Text>
            <Text style={styles.copy}>This adds a bookable company beside Reya Lab and Reya Imaging.</Text>
            <Field label="Business name" value={business.name} onChangeText={(name) => setBusiness({ ...business, name })} />
            <Field label="Contact email" value={business.email} onChangeText={(email) => setBusiness({ ...business, email })} />
            <View style={styles.row}>
              <Pressable onPress={() => setBusiness({ ...business, lab: !business.lab })} style={styles.check}>
                <Text style={styles.copy}>{business.lab ? '✓' : '○'} Lab</Text>
              </Pressable>
              <Pressable onPress={() => setBusiness({ ...business, imaging: !business.imaging })} style={styles.check}>
                <Text style={styles.copy}>{business.imaging ? '✓' : '○'} Imaging</Text>
              </Pressable>
            </View>
            <Pressable onPress={addBusiness} style={styles.button}>
              <Text style={styles.buttonText}>Add business</Text>
            </Pressable>
            {catalog.businesses.map((item) => (
              <Text key={item.id} style={styles.copy}>
                {item.name} · {(item.services || []).join(', ')}
              </Text>
            ))}

            <Text style={styles.heading}>Create a login</Text>
            <Text style={styles.copy}>
              {catalog.email_ready
                ? 'An email is sent with a temporary password.'
                : 'Email is not connected yet. The temporary password is shown here once.'}
            </Text>
            <Field label="Name" value={invite.name} onChangeText={(name) => setInvite({ ...invite, name })} />
            <Field label="Email" value={invite.email} onChangeText={(email) => setInvite({ ...invite, email })} />
            <View style={styles.row}>
              {['provider', 'staff'].map((role) => (
                <Pressable key={role} onPress={() => setInvite({ ...invite, role })} style={styles.check}>
                  <Text style={styles.copy}>{invite.role === role ? '✓' : '○'} {role}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={sendInvite} style={styles.button}>
              <Text style={styles.buttonText}>Create login</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function PriceRow({ item, onSave }) {
  const [price, setPrice] = useState(String(item.price));
  return (
    <View style={styles.priceRow}>
      <View style={styles.priceCopy}>
        <Text style={styles.copy}>{item.name}</Text>
        <Text style={styles.meta}>{item.kind} · {item.code}</Text>
      </View>
      <TextInput value={price} onChangeText={setPrice} style={styles.priceInput} />
      <Pressable onPress={() => onSave(item.code, price)} style={styles.small}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 48 },
  body: { maxWidth: 880, width: '100%', alignSelf: 'center', padding: 24 },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  heading: { fontFamily: font, fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 28 },
  copy: { fontFamily: font, color: colors.ink, marginTop: 8, lineHeight: 22 },
  meta: { fontFamily: font, color: colors.muted, fontSize: 12 },
  card: { marginTop: 18, maxWidth: 420 },
  field: { marginTop: 12 },
  label: { fontFamily: font, fontWeight: '700', color: colors.ink },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: font,
  },
  button: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  small: { backgroundColor: colors.purple, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  buttonText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  error: { fontFamily: font, color: '#B42318', marginTop: 10 },
  notice: { fontFamily: font, color: colors.ink, marginTop: 12 },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  check: { paddingVertical: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  priceCopy: { flex: 1 },
  priceInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontFamily: font,
  },
});
