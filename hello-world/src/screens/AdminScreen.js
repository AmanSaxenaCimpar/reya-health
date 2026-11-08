import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  addOfficeTest,
  inviteLogin,
  officeCatalog,
  officeLogin,
  registerBusiness,
  removeOfficeTest,
  saveContent,
  savePrice,
  saveQuestions,
  saveRules,
  uploadOfficeTests,
} from '../api';
import { SiteHeader } from '../SiteHeader';
import { colors, font } from '../theme';

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
  const [rule, setRule] = useState({ base_zip: '60611', transport_fee: '40', bands: [] });
  const [testForm, setTestForm] = useState({ code: '', name: '', kind: 'lab', cpt: '', price: '' });
  const [business, setBusiness] = useState({ name: '', email: '', service: 'lab' });
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
          base_zip: payload.service?.base_zip || '60611',
          transport_fee: String(payload.service?.transport_fee ?? 0),
          bands: (payload.bands || []).map((band) => ({
            from_miles: String(band.from_miles),
            to_miles: String(band.to_miles),
            extra: String(band.extra),
          })),
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
    await saveRules(token, {
      base_zip: rule.base_zip,
      transport_fee: Number(rule.transport_fee),
      bands: rule.bands.map((band) => ({
        from_miles: Number(band.from_miles),
        to_miles: Number(band.to_miles),
        extra: Number(band.extra),
      })),
    });
    setNotice('Mileage rules saved. A ZIP past the last band is not served.');
  }

  function updateBand(index, key, value) {
    setRule((current) => ({
      ...current,
      bands: current.bands.map((band, bandIndex) => (bandIndex === index ? { ...band, [key]: value } : band)),
    }));
  }

  async function updatePrice(code, price) {
    await savePrice(token, code, Number(price));
    setCatalog((current) => ({
      ...current,
      tests: current.tests.map((item) => (item.code === code ? { ...item, price: Number(price) } : item)),
    }));
  }

  async function refreshCatalog() {
    const payload = await officeCatalog(token);
    setCatalog(payload);
  }

  async function createTest() {
    await addOfficeTest(token, {
      ...testForm,
      kind: catalog?.role || 'lab',
      price: Number(testForm.price || 0),
    });
    setTestForm({ code: '', name: '', kind: catalog?.role || 'lab', cpt: '', price: '' });
    await refreshCatalog();
    setNotice('Test added.');
  }

  async function deleteTest(code) {
    await removeOfficeTest(token, code);
    await refreshCatalog();
  }

  async function uploadTests() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const result = await uploadOfficeTests(token, file);
      await refreshCatalog();
      setNotice(`Upload finished. Added ${result.added}, updated ${result.updated}.`);
    };
    input.click();
  }

  async function addBusiness() {
    const created = await registerBusiness(token, {
      name: business.name,
      email: business.email,
      services: [catalog?.role || 'lab'],
    });
    setBusiness({ name: '', email: '', service: catalog?.role || 'lab' });
    setNotice(
      `${created.name} has its own back office. Email ${created.email}. Password ${created.password}. Sign out and use that login. This office cannot see or edit that business.`
    );
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
            <Text style={styles.copy}>
              Each business has its own login. A lab office cannot see an imaging office, and a new business gets a new login when it is registered.
            </Text>
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
            <Text style={styles.heading}>{catalog.business_name || 'Back office'}</Text>
            <Text style={styles.copy}>
              This login edits only {catalog.business_name}: its tests, test details, questionnaires, mileage prices, and its own staff logins.
            </Text>
            <Text style={styles.heading}>Mileage price rules</Text>
            <Text style={styles.copy}>
              A visit total is the selected test fees, plus one fixed transportation fee, plus the extra amount Z for the mile band. Service stops at the last band. Example: 10–25 miles adds $25, 25–50 miles adds $50, and anything past 50 miles is not served.
            </Text>
            <Field label="Starting ZIP" value={rule.base_zip} onChangeText={(base_zip) => setRule({ ...rule, base_zip })} />
            <Field
              label="Fixed transportation fee ($)"
              value={rule.transport_fee}
              onChangeText={(transport_fee) => setRule({ ...rule, transport_fee })}
            />
            {rule.bands.map((band, index) => (
              <View key={`${band.from_miles}-${index}`} style={styles.priceRow}>
                <TextInput value={band.from_miles} onChangeText={(value) => updateBand(index, 'from_miles', value)} style={styles.priceInput} />
                <Text style={styles.copy}>to</Text>
                <TextInput value={band.to_miles} onChangeText={(value) => updateBand(index, 'to_miles', value)} style={styles.priceInput} />
                <Text style={styles.copy}>miles, add $</Text>
                <TextInput value={band.extra} onChangeText={(value) => updateBand(index, 'extra', value)} style={styles.priceInput} />
                <Pressable
                  onPress={() => setRule({ ...rule, bands: rule.bands.filter((_, bandIndex) => bandIndex !== index) })}
                  style={styles.small}
                >
                  <Text style={styles.buttonText}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={() => setRule({ ...rule, bands: [...rule.bands, { from_miles: '', to_miles: '', extra: '' }] })}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Add a mile band</Text>
            </Pressable>
            <Pressable onPress={saveRule} style={styles.button}>
              <Text style={styles.buttonText}>Save mileage rules</Text>
            </Pressable>

            <Text style={styles.heading}>Tests</Text>
            <Text style={styles.copy}>
              Add or remove one {catalog.role} test, or upload a CSV or Excel file. The first row must be: code, name, kind, cpt, price. Every row is saved as {catalog.role}. Save the file from Excel as CSV if the workbook upload fails.
            </Text>
            <Field label="Code" value={testForm.code} onChangeText={(code) => setTestForm({ ...testForm, code })} />
            <Field label="Name" value={testForm.name} onChangeText={(name) => setTestForm({ ...testForm, name })} />
            <Field label="CPT" value={testForm.cpt} onChangeText={(cpt) => setTestForm({ ...testForm, cpt })} />
            <Field label="Price" value={testForm.price} onChangeText={(price) => setTestForm({ ...testForm, price })} />
            <Pressable onPress={createTest} style={styles.button}>
              <Text style={styles.buttonText}>Add test</Text>
            </Pressable>
            <Pressable onPress={uploadTests} style={styles.button}>
              <Text style={styles.buttonText}>Upload CSV or Excel</Text>
            </Pressable>
            {catalog.tests.map((item) => (
              <PriceRow
                key={item.code}
                item={item}
                onSave={updatePrice}
                onRemove={deleteTest}
                onSaveContent={async (content) => {
                  await saveContent(token, content);
                  setNotice(`Saved details for ${content.code}.`);
                }}
              />
            ))}

            <Text style={styles.heading}>General questionnaire</Text>
            <Text style={styles.copy}>These questions appear after patient information on this service only.</Text>
            <QuestionEditor
              questions={catalog.general_questions || []}
              onSave={async (questions) => {
                await saveQuestions(token, { key: 'general', questions });
                setNotice('General questions saved.');
              }}
            />
            {(catalog.question_groups || []).map((group) => (
              <View key={group.key}>
                <Text style={styles.heading}>{group.title}</Text>
                <QuestionEditor
                  questions={group.questions || []}
                  onSave={async (questions) => {
                    await saveQuestions(token, { key: group.key, questions });
                    setNotice(`${group.title} questions saved.`);
                  }}
                />
              </View>
            ))}

            <Text style={styles.heading}>Register a business</Text>
            <Text style={styles.copy}>
              This creates a separate {catalog.role} business with its own login. It starts empty, uses a different tax identity, and is never billed with {catalog.business_name}.
            </Text>
            <Field label="Business name" value={business.name} onChangeText={(name) => setBusiness({ ...business, name })} />
            <Field label="Contact email" value={business.email} onChangeText={(email) => setBusiness({ ...business, email })} />
            <Pressable onPress={addBusiness} style={styles.button}>
              <Text style={styles.buttonText}>Add business</Text>
            </Pressable>
            <Text style={styles.heading}>Staff logins</Text>
            <Text style={styles.copy}>
              {catalog.email_ready
                ? `An email is sent with a temporary password. The login can edit only ${catalog.business_name}.`
                : `Email is not connected yet. The temporary password is shown here once and works only for ${catalog.business_name}.`}
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

function PriceRow({ item, onSave, onRemove, onSaveContent }) {
  const [price, setPrice] = useState(String(item.price));
  const [summary, setSummary] = useState(item.summary || '');
  const [details, setDetails] = useState(
    (item.sections || []).map((section) => `${section.title || ''}\n${section.body || ''}`).join('\n\n')
  );
  return (
    <View style={styles.testCard}>
      <View style={styles.priceRow}>
        <View style={styles.priceCopy}>
          <Text style={styles.copy}>{item.name}</Text>
          <Text style={styles.meta}>{item.kind} · {item.code}</Text>
        </View>
        <TextInput value={price} onChangeText={setPrice} style={styles.priceInput} />
        <Pressable onPress={() => onSave(item.code, price)} style={styles.small}>
          <Text style={styles.buttonText}>Save price</Text>
        </Pressable>
        <Pressable onPress={() => onRemove(item.code)} style={styles.small}>
          <Text style={styles.buttonText}>Remove</Text>
        </Pressable>
      </View>
      <Field label="Short description" value={summary} onChangeText={setSummary} />
      <Field
        label="Test details"
        value={details}
        multiline
        onChangeText={setDetails}
      />
      <Text style={styles.meta}>Put a heading on its own line, then the detail text. Leave a blank line between sections.</Text>
      <Pressable
        onPress={() =>
          onSaveContent({
            code: item.code,
            summary,
            sections: details
              .split(/\n\s*\n/)
              .map((block) => block.trim())
              .filter(Boolean)
              .map((block) => {
                const [title, ...rest] = block.split('\n');
                return { title: title.trim(), body: rest.join('\n').trim() || title.trim() };
              }),
          })
        }
        style={styles.button}
      >
        <Text style={styles.buttonText}>Save test details</Text>
      </Pressable>
    </View>
  );
}

function QuestionEditor({ questions, onSave }) {
  const [rows, setRows] = useState(questions || []);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    setRows(questions || []);
  }, [questions]);

  return (
    <View>
      {rows.map((question, index) => (
        <View key={question.id || index} style={styles.priceRow}>
          <TextInput
            value={question.prompt}
            onChangeText={(prompt) => setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, prompt } : row)))}
            style={[styles.input, styles.priceCopy]}
          />
          <Pressable onPress={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))} style={styles.small}>
            <Text style={styles.buttonText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Field label="New question" value={prompt} onChangeText={setPrompt} />
      <Pressable
        onPress={() => {
          if (!prompt.trim()) {
            return;
          }
          setRows([...rows, { id: `q${Date.now()}`, prompt: prompt.trim(), type: 'yes_no' }]);
          setPrompt('');
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Add question</Text>
      </Pressable>
      <Pressable onPress={() => onSave(rows)} style={styles.button}>
        <Text style={styles.buttonText}>Save questions</Text>
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
  testCard: { marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
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
