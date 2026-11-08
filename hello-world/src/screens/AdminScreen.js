import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  API_URL,
  addOfficeTest,
  inviteLogin,
  officeCatalog,
  officeLogin,
  officeMessage,
  officeNote,
  officePatients,
  officeResult,
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

export function AdminScreen({ onHome, onAbout, account, onPortal, onSignOut }) {
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
  const [invite, setInvite] = useState({ name: '', email: '', role: 'provider' });
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('general');
  const [patientVisits, setPatientVisits] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [patientNote, setPatientNote] = useState('');

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

  useEffect(() => {
    if (!token || section !== 'patients') {
      return;
    }
    officePatients(token)
      .then((payload) => setPatientVisits(payload.visits || []))
      .catch((err) => setNotice(err.message));
  }, [token, section]);

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
      <SiteHeader onHome={onHome} onAbout={onAbout} onPortal={onPortal} account={account} onSignOut={onSignOut} />
      <View style={styles.body}>
        <Text style={styles.title}>Back office</Text>
        {!token || !catalog ? (
          <View style={styles.card}>
            <Text style={styles.copy}>
              Sign in with this business’s login. A lab office cannot see or edit an imaging office.
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
            <View style={styles.tabs}>
              {[
                ['general', 'General questionnaire'],
                ['service', 'Service questions'],
                ['tests', 'Add a service'],
                ['pricing', 'Pricing'],
                ['patients', 'Patients'],
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setSection(key)}
                  style={[styles.tab, section === key && styles.tabOn]}
                >
                  <Text style={[styles.tabText, section === key && styles.tabTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={section === 'general' ? styles.section : styles.hidden}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Questions after patient information</Text>
                <Text style={styles.copy}>These appear on this service only, after the patient details step.</Text>
                <QuestionEditor
                  questions={catalog.general_questions || []}
                  onSave={async (questions) => {
                    await saveQuestions(token, { key: 'general', questions });
                    setNotice('General questions saved.');
                  }}
                />
              </View>
            </View>

            <View style={section === 'service' ? styles.section : styles.hidden}>
              {(catalog.question_groups || []).map((group) => (
                <View key={group.key} style={styles.panel}>
                  <Text style={styles.panelTitle}>{group.title}</Text>
                  <QuestionEditor
                    questions={group.questions || []}
                    onSave={async (questions) => {
                      await saveQuestions(token, { key: group.key, questions });
                      setNotice(`${group.title} questions saved.`);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={section === 'tests' ? styles.section : styles.hidden}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>New {catalog.role} test</Text>
                <Text style={styles.copy}>
                  Fill the four fields, or upload a CSV or Excel file. The first row must be code, name, kind, cpt, price. Every row is saved as {catalog.role}.
                </Text>
                <View style={styles.formGrid}>
                  <Field label="Code" value={testForm.code} placeholder="CBC" onChangeText={(code) => setTestForm({ ...testForm, code })} />
                  <Field label="Name" wide value={testForm.name} placeholder="Complete blood count" onChangeText={(name) => setTestForm({ ...testForm, name })} />
                  <Field label="CPT" value={testForm.cpt} placeholder="85025" onChangeText={(cpt) => setTestForm({ ...testForm, cpt })} />
                  <Field label="Price" value={testForm.price} placeholder="39" keyboardType="decimal-pad" onChangeText={(price) => setTestForm({ ...testForm, price })} />
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={createTest} style={styles.button}>
                    <Text style={styles.buttonText}>Add test</Text>
                  </Pressable>
                  <Pressable onPress={uploadTests} style={styles.ghost}>
                    <Text style={styles.ghostText}>Upload CSV or Excel</Text>
                  </Pressable>
                </View>
              </View>
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
            </View>

            <View style={section === 'pricing' ? styles.section : styles.hidden}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>How the visit is priced</Text>
                <Text style={styles.copy}>
                  Test fees, plus one transportation fee, plus the dollar amount for the mile band. Service stops at the last band.
                </Text>
                <View style={styles.formGrid}>
                  <Field label="Starting ZIP" value={rule.base_zip} placeholder="60611" onChangeText={(base_zip) => setRule({ ...rule, base_zip })} />
                  <Field
                    label="Transportation fee ($)"
                    value={rule.transport_fee}
                    placeholder="40"
                    keyboardType="decimal-pad"
                    onChangeText={(transport_fee) => setRule({ ...rule, transport_fee })}
                  />
                </View>
              </View>
              {rule.bands.map((band, index) => (
                <View key={`${band.from_miles}-${index}`} style={styles.panel}>
                  <View style={styles.testHead}>
                    <Text style={styles.panelTitle}>Band {index + 1}</Text>
                    <Pressable
                      onPress={() => setRule({ ...rule, bands: rule.bands.filter((_, bandIndex) => bandIndex !== index) })}
                      style={styles.quiet}
                    >
                      <Text style={styles.quietText}>Remove</Text>
                    </Pressable>
                  </View>
                  <View style={styles.formGrid}>
                    <Field label="From miles" value={band.from_miles} keyboardType="decimal-pad" onChangeText={(value) => updateBand(index, 'from_miles', value)} />
                    <Field label="To miles" value={band.to_miles} keyboardType="decimal-pad" onChangeText={(value) => updateBand(index, 'to_miles', value)} />
                    <Field label="Add ($)" value={band.extra} keyboardType="decimal-pad" onChangeText={(value) => updateBand(index, 'extra', value)} />
                  </View>
                </View>
              ))}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setRule({ ...rule, bands: [...rule.bands, { from_miles: '', to_miles: '', extra: '' }] })}
                  style={styles.ghost}
                >
                  <Text style={styles.ghostText}>Add a mile band</Text>
                </Pressable>
                <Pressable onPress={saveRule} style={styles.button}>
                  <Text style={styles.buttonText}>Save mileage rules</Text>
                </Pressable>
              </View>
            </View>

            <View style={section === 'patients' ? styles.section : styles.hidden}>
              <PatientDesk
                visits={patientVisits}
                selectedId={patientId}
                note={patientNote}
                token={token}
                onSelect={setPatientId}
                onNote={setPatientNote}
                onChange={async (message) => {
                  const payload = await officePatients(token);
                  setPatientVisits(payload.visits || []);
                  if (message) {
                    setNotice(message);
                  }
                }}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Staff logins</Text>
              <Text style={styles.copy}>
                {catalog.email_ready
                  ? `An email is sent with a temporary password. The login can edit only ${catalog.business_name}.`
                  : `Email is not connected yet. The temporary password is shown here once and works only for ${catalog.business_name}.`}
              </Text>
              <View style={styles.formGrid}>
                <Field label="Name" value={invite.name} placeholder="Alex Rivera" onChangeText={(name) => setInvite({ ...invite, name })} />
                <Field label="Email" value={invite.email} placeholder="alex@clinic.com" autoCapitalize="none" onChangeText={(email) => setInvite({ ...invite, email })} />
              </View>
              <View style={styles.segment}>
                {['provider', 'staff'].map((role) => (
                  <Pressable key={role} onPress={() => setInvite({ ...invite, role })} style={[styles.segmentItem, invite.role === role && styles.segmentOn]}>
                    <Text style={[styles.segmentText, invite.role === role && styles.segmentTextOn]}>{role}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={sendInvite} style={styles.button}>
                <Text style={styles.buttonText}>Create login</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function PatientDesk({ visits, selectedId, note, token, onSelect, onNote, onChange }) {
  const current = visits.find((item) => item.id === selectedId);
  const [doctorNote, setDoctorNote] = useState('');
  async function reply() {
    if (!current || !note.trim()) {
      return;
    }
    await officeMessage(token, current.id, note.trim());
    onNote('');
    await onChange('Message sent to the patient.');
  }
  async function addResult() {
    if (!current) {
      return;
    }
    const file = await pickOfficeFile();
    if (!file) {
      return;
    }
    await officeResult(token, { visit_id: current.id, ...file });
    await onChange('Result added. The patient can open it in the portal.');
  }
  return (
    <View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Patient visits</Text>
        <Text style={styles.copy}>
          Orders, uploads, and messages for this business. Add a result here when it comes back. The patient sees it in the portal.
        </Text>
        {!visits.length ? <Text style={styles.meta}>No patient visits yet. A visit appears after someone books while signed in.</Text> : null}
      </View>
      {visits.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id === selectedId ? '' : item.id)} style={styles.panel}>
          <Text style={styles.panelTitle}>{item.patient_name}</Text>
          <Text style={styles.copy}>{item.patient_email}</Text>
          <Text style={styles.meta}>
            {item.appointment_date} {item.appointment_time} · {(item.tests || []).join(', ')}
          </Text>
        </Pressable>
      ))}
      {current ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Visit files</Text>
          {(current.documents || []).map((file) => (
            <Pressable key={file.id} onPress={() => window.open(officeFileLink(file, token), '_blank', 'noopener')} style={styles.questionRow}>
              <Text style={styles.copy}>{file.kind}: {file.name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={addResult} style={styles.ghost}>
            <Text style={styles.ghostText}>Add a result PDF or image</Text>
          </Pressable>
          <Text style={styles.subheading}>Messages</Text>
          {(current.messages || []).map((message) => (
            <View key={message.id} style={styles.group}>
              <Text style={styles.meta}>{message.author} · {message.created}</Text>
              <Text style={styles.copy}>{message.body}</Text>
            </View>
          ))}
          <Field label="Reply to the patient" value={note} multiline onChangeText={onNote} />
          <Pressable onPress={reply} style={styles.button}>
            <Text style={styles.buttonText}>Send reply</Text>
          </Pressable>
          <Field label="Doctor's note" value={doctorNote} multiline onChangeText={setDoctorNote} />
          <Pressable
            onPress={async () => {
              if (!doctorNote.trim()) {
                return;
              }
              await officeNote(token, current.id, doctorNote.trim());
              setDoctorNote('');
              await onChange("Doctor's note saved. The patient can read it in the portal.");
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Save doctor's note</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function officeFileLink(file, token) {
  if (file.kind === 'order' && file.order_id) {
    return `${API_URL}/orders/${file.order_id}`;
  }
  return `${API_URL}/office/files/${file.id}?token=${encodeURIComponent(token)}`;
}

function pickOfficeFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/jpeg,image/png,image/webp,image/gif';
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

function PriceRow({ item, onSave, onRemove, onSaveContent }) {
  const [price, setPrice] = useState(String(item.price));
  const [summary, setSummary] = useState(item.summary || '');
  const [details, setDetails] = useState(
    (item.sections || []).map((section) => `${section.title || ''}\n${section.body || ''}`).join('\n\n')
  );
  return (
    <View style={styles.panel}>
      <View style={styles.testHead}>
        <View style={styles.grow}>
          <Text style={styles.panelTitle}>{item.name}</Text>
          <Text style={styles.meta}>{item.kind} · {item.code}</Text>
        </View>
        <Pressable onPress={() => onRemove(item.code)} style={styles.quiet}>
          <Text style={styles.quietText}>Remove</Text>
        </Pressable>
      </View>
      <View style={styles.priceLine}>
        <Field label="Price ($)" value={price} keyboardType="decimal-pad" onChangeText={setPrice} />
        <Pressable onPress={() => onSave(item.code, price)} style={styles.button}>
          <Text style={styles.buttonText}>Save price</Text>
        </Pressable>
      </View>
      <Field label="Short description" value={summary} multiline onChangeText={setSummary} />
      <Field label="Test details" value={details} multiline tall onChangeText={setDetails} />
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
        <View key={question.id || index} style={styles.questionRow}>
          <TextInput
            value={question.prompt}
            multiline
            onChangeText={(prompt) => setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, prompt } : row)))}
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.grow]}
          />
          <Pressable onPress={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))} style={styles.quiet}>
            <Text style={styles.quietText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Field label="New question" value={prompt} placeholder="Type the question, then add it" onChangeText={setPrompt} />
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            if (!prompt.trim()) {
              return;
            }
            setRows([...rows, { id: `q${Date.now()}`, prompt: prompt.trim(), type: 'yes_no' }]);
            setPrompt('');
          }}
          style={styles.ghost}
        >
          <Text style={styles.ghostText}>Add question</Text>
        </Pressable>
        <Pressable onPress={() => onSave(rows)} style={styles.button}>
          <Text style={styles.buttonText}>Save questions</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, wide, tall, style, ...props }) {
  return (
    <View style={[styles.field, wide && styles.fieldWide, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={tall || props.multiline}
        placeholderTextColor={colors.muted}
        style={[styles.input, tall && styles.inputTall, props.multiline && !tall && styles.inputShort]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F3F8' },
  content: { paddingBottom: 64 },
  body: { maxWidth: 920, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28 },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  heading: { fontFamily: font, fontSize: 26, fontWeight: '700', color: colors.ink, marginTop: 8 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  tab: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  tabOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  tabText: { fontFamily: font, color: colors.ink, fontWeight: '600', fontSize: 14 },
  tabTextOn: { color: colors.white },
  section: { marginTop: 16 },
  hidden: { display: 'none' },
  panel: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
  },
  panelTitle: { fontFamily: font, fontSize: 18, fontWeight: '700', color: colors.ink },
  copy: { fontFamily: font, color: colors.muted, marginTop: 6, lineHeight: 22, fontSize: 14 },
  meta: { fontFamily: font, color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
  card: {
    marginTop: 20,
    maxWidth: 440,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
  },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  field: { marginTop: 8, minWidth: 160, flexGrow: 1, flexBasis: 180 },
  fieldWide: { flexBasis: 320 },
  label: { fontFamily: font, fontWeight: '600', color: colors.ink, fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#FCFBFD',
    outlineStyle: 'none',
  },
  inputShort: { minHeight: 72, textAlignVertical: 'top' },
  inputTall: { minHeight: 160, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 },
  button: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { fontFamily: font, color: colors.white, fontWeight: '700', fontSize: 14 },
  ghost: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ghostText: { fontFamily: font, color: colors.ink, fontWeight: '700', fontSize: 14 },
  quiet: { paddingHorizontal: 8, paddingVertical: 8 },
  quietText: { fontFamily: font, color: '#8A3A3A', fontWeight: '600', fontSize: 13 },
  error: { fontFamily: font, color: '#B42318', marginTop: 10 },
  notice: {
    fontFamily: font,
    color: colors.ink,
    marginTop: 16,
    backgroundColor: '#EFE7F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white },
  segmentOn: { backgroundColor: colors.purple },
  segmentText: { fontFamily: font, color: colors.ink, fontWeight: '600', textTransform: 'capitalize' },
  segmentTextOn: { color: colors.white },
  testHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  grow: { flex: 1 },
  priceLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
});
