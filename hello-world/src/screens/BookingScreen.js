import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadImaging, loadLabs, loadQuestionnaires } from '../api';
import { SiteHeader } from '../SiteHeader';
import { colors, font, money } from '../theme';

const times = ['8:00 AM', '9:30 AM', '11:00 AM', '1:00 PM', '2:30 PM'];

function upcomingDates() {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function pickFile() {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = () => resolve(input.files?.[0]?.name || '');
    input.click();
  });
}

function answered(question, answers) {
  const value = answers[question.id];
  if (!value) {
    return false;
  }
  if (question.type === 'yes_no_detail' || question.type === 'yes_no_unsure_detail') {
    if (value.choice === 'Yes') {
      return Boolean(value.detail?.trim());
    }
    return Boolean(value.choice);
  }
  if (question.type === 'yes_no_unsure_multi') {
    if (value.choice === 'Yes') {
      return Array.isArray(value.selected) && value.selected.length > 0;
    }
    return Boolean(value.choice);
  }
  if (question.type === 'text') {
    return Boolean(String(value).trim());
  }
  return Boolean(value);
}

export function BookingScreen({ visit, onHome, onAbout, onBack }) {
  const dates = useMemo(() => upcomingDates(), []);
  const [labs, setLabs] = useState([]);
  const [imaging, setImaging] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [order, setOrder] = useState('');
  const [fileName, setFileName] = useState('');
  const [services, setServices] = useState(
    visit.service === 'lab' || visit.service === 'imaging' ? [visit.service] : []
  );
  const [labPicked, setLabPicked] = useState([]);
  const [imagingPicked, setImagingPicked] = useState([]);
  const [answers, setAnswers] = useState({});
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('');
  const [info, setInfo] = useState({
    first: '',
    last: '',
    dob: '',
    gender: '',
    relationship: '',
    phone: '',
    email: '',
  });
  const [stepKey, setStepKey] = useState('order');
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([loadLabs(), loadImaging()])
      .then(([labRows, imagingRows]) => {
        setLabs(labRows);
        setImaging(imagingRows);
      })
      .catch(() => setLoadError('Could not load tests from the Python API.'));
  }, []);

  useEffect(() => {
    if (!labPicked.length && !imagingPicked.length) {
      setSections([]);
      return;
    }
    loadQuestionnaires(labPicked, imagingPicked)
      .then((payload) => setSections(payload.sections || []))
      .catch(() => setLoadError('Could not load questionnaires from the Python API.'));
  }, [labPicked, imagingPicked]);

  const steps = ['order', 'choose'];
  if (services.includes('lab')) {
    steps.push('lab');
  }
  if (services.includes('imaging')) {
    steps.push('imaging');
  }
  if (services.includes('lab') || services.includes('imaging')) {
    steps.push('questions');
  }
  steps.push('schedule', 'info', 'payment');

  const index = Math.max(steps.indexOf(stepKey), 0);
  const selectedLabs = labs.filter((item) => labPicked.includes(item.code));
  const selectedImaging = imaging.filter((item) => imagingPicked.includes(item.code));
  const chosen = [...selectedLabs, ...selectedImaging];
  const serviceFee = chosen.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const setupTotal = selectedImaging.reduce((sum, item) => sum + Number(item.setup_fee || 0), 0);
  const total = serviceFee + setupTotal;
  const allQuestions = sections.flatMap((section) => section.questions);
  const questionsDone = allQuestions.length > 0 && allQuestions.every((question) => answered(question, answers));
  const urgentHit = allQuestions.some(
    (question) => question.urgent && answers[question.id]?.choice === question.escalate_if
  );

  function go(next) {
    setStepKey(next);
  }

  function back() {
    if (index === 0) {
      onBack();
      return;
    }
    go(steps[index - 1]);
  }

  function next() {
    go(steps[index + 1]);
  }

  function toggleService(key) {
    setServices((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
    if (key === 'lab' && services.includes('lab')) {
      setLabPicked([]);
    }
    if (key === 'imaging' && services.includes('imaging')) {
      setImagingPicked([]);
    }
  }

  function toggleCode(list, setList, code) {
    setList(list.includes(code) ? list.filter((item) => item !== code) : [...list, code]);
  }

  function setAnswer(question, patch) {
    setAnswers((current) => ({
      ...current,
      [question.id]: typeof patch === 'string' ? patch : { ...(current[question.id] || {}), ...patch },
    }));
  }

  const canContinue = {
    order: order === 'no' || (order === 'yes' && fileName),
    choose: services.length > 0,
    lab: labPicked.length > 0,
    imaging: imagingPicked.length > 0,
    questions: questionsDone && !urgentHit,
    schedule: Boolean(date && time),
    info: info.first && info.last && info.dob && info.gender && info.relationship && info.phone && info.email,
    payment: true,
  }[stepKey];

  if (done) {
    return (
      <Page onHome={onHome} onAbout={onAbout}>
        <Pressable onPress={() => setDone(false)} style={styles.backButton}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Visit requested</Text>
        <Text style={styles.copy}>
          {visit.company}. {chosen.map((item) => item.name).join(', ')} at home, ZIP {visit.zip}.{' '}
          {date ? formatDate(date) : ''} {time}.
        </Text>
        <Text style={styles.copy}>Total {money(total)}. Payment is confirmed when the database is connected.</Text>
        <View style={styles.navRow}>
          <Pressable onPress={onBack} style={styles.backOutline}>
            <Text style={styles.backOutlineText}>← Back to Find care</Text>
          </Pressable>
        </View>
      </Page>
    );
  }

  return (
    <Page onHome={onHome} onAbout={onAbout}>
      <Pressable onPress={back} style={styles.backButton}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.copy}>{visit.company}</Text>
      <Text style={styles.step}>
        Step {index + 1} of {steps.length}
      </Text>
      <View style={styles.bar}>
        {steps.map((key, stepIndex) => (
          <View key={key} style={[styles.segment, stepIndex <= index && styles.segmentOn]} />
        ))}
      </View>
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {stepKey === 'order' ? (
        <View>
          <Text style={styles.title}>Physician order</Text>
          <Text style={styles.copy}>Most services require a physician's order. Do you have one?</Text>
          <Choice
            title="Yes, I have a physician's order"
            detail="Upload the order document now"
            on={order === 'yes'}
            onPress={() => setOrder('yes')}
          />
          <Choice
            title="No, I don't have one yet"
            detail="You can still book — we'll guide you through the next steps"
            on={order === 'no'}
            onPress={() => setOrder('no')}
          />
          {order === 'yes' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>48-hour notice required</Text>
              <Text style={styles.noticeCopy}>Submit the order at least 48 hours before the appointment.</Text>
              <Pressable onPress={async () => setFileName(await pickFile())} style={styles.outline}>
                <Text style={styles.outlineText}>Upload document</Text>
              </Pressable>
              {fileName ? <Text style={styles.copy}>{fileName}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {stepKey === 'choose' ? (
        <View>
          <Text style={styles.title}>Choose a service</Text>
          <Text style={styles.copy}>Select Lab, Imaging, or both. Shared and specific questionnaires follow your selections.</Text>
          <Choice
            title="Laboratory"
            detail="Top lab panels and individual tests"
            on={services.includes('lab')}
            onPress={() => toggleService('lab')}
          />
          <Choice
            title="Imaging"
            detail="X-ray, EKG, and ultrasound"
            on={services.includes('imaging')}
            onPress={() => toggleService('imaging')}
          />
        </View>
      ) : null}

      {stepKey === 'lab' ? (
        <Catalog
          title="Lab tests"
          items={labs.map((item) => ({
            code: item.code,
            name: item.name,
            detail: `${item.code} · CPT ${item.cpt}`,
            price: item.price,
          }))}
          picked={labPicked}
          onToggle={(code) => toggleCode(labPicked, setLabPicked, code)}
        />
      ) : null}

      {stepKey === 'imaging' ? (
        <Catalog
          title="Imaging"
          items={imaging.map((item) => ({
            code: item.code,
            name: item.name,
            detail: `${item.category} · CPT ${item.cpt} · setup ${money(item.setup_fee)}`,
            price: item.price,
          }))}
          picked={imagingPicked}
          onToggle={(code) => toggleCode(imagingPicked, setImagingPicked, code)}
        />
      ) : null}

      {stepKey === 'questions' ? (
        <View>
          <Text style={styles.title}>Questionnaires</Text>
          <Text style={styles.copy}>
            Shared questions appear for every Lab or Imaging visit. Specific questions are added for
            each selected test.
          </Text>
          {urgentHit ? (
            <Text style={styles.error}>
              Severe or rapidly worsening symptoms were reported. Do not continue online booking.
              Call 911 or seek emergency care.
            </Text>
          ) : null}
          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.questions.map((question) => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(patch) => setAnswer(question, patch)}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {stepKey === 'schedule' ? (
        <View>
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.copy}>Choose a date and time. Same-day and next-day visits are not available.</Text>
          <Text style={styles.label}>Date</Text>
          <View style={styles.wrap}>
            {dates.map((item) => (
              <Pressable
                key={item.toISOString()}
                onPress={() => setDate(item)}
                style={[styles.chip, date && formatDate(date) === formatDate(item) && styles.chipOn]}
              >
                <Text style={styles.chipText}>{formatDate(item)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Time · Central Time (Chicago)</Text>
          <View style={styles.wrap}>
            {times.map((item) => (
              <Pressable
                key={item}
                onPress={() => setTime(item)}
                style={[styles.chip, time === item && styles.chipOn]}
              >
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {stepKey === 'info' ? (
        <View>
          <Text style={styles.title}>Your information</Text>
          <View style={styles.row}>
            <Field label="Patient first name" value={info.first} onChangeText={(first) => setInfo({ ...info, first })} />
            <Field label="Patient last name" value={info.last} onChangeText={(last) => setInfo({ ...info, last })} />
          </View>
          <Field label="Date of birth" value={info.dob} placeholder="mm/dd/yyyy" onChangeText={(dob) => setInfo({ ...info, dob })} />
          <Text style={styles.label}>Gender</Text>
          <View style={styles.row}>
            {['Male', 'Female'].map((item) => (
              <Pressable key={item} onPress={() => setInfo({ ...info, gender: item })} style={[styles.outline, info.gender === item && styles.chipOn]}>
                <Text style={styles.outlineText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Relationship</Text>
          <View style={styles.row}>
            {['Self', 'Guardian'].map((item) => (
              <Pressable
                key={item}
                onPress={() => setInfo({ ...info, relationship: item })}
                style={[styles.outline, info.relationship === item && styles.chipOn]}
              >
                <Text style={styles.outlineText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Phone" value={info.phone} placeholder="(312) 555-0100" onChangeText={(phone) => setInfo({ ...info, phone })} />
          <Field label="Email" value={info.email} placeholder="you@email.com" onChangeText={(email) => setInfo({ ...info, email })} />
        </View>
      ) : null}

      {stepKey === 'payment' ? (
        <View>
          <Text style={styles.title}>Payment</Text>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Appointment summary</Text>
            <Text style={styles.testName}>{chosen.map((item) => item.name).join(', ')}</Text>
            <Text style={styles.copy}>
              {visit.company} · At home · ZIP {visit.zip}
              {date ? ` · ${formatDate(date)} · ${time}` : ''}
            </Text>
            <Text style={styles.copy}>Service fee {money(serviceFee)}</Text>
            {setupTotal > 0 ? <Text style={styles.copy}>Setup fee {money(setupTotal)}</Text> : null}
            <Text style={styles.answer}>Total {money(total)}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable onPress={back} style={styles.backOutline}>
          <Text style={styles.backOutlineText}>← Back</Text>
        </Pressable>
        {canContinue ? (
          <Pressable onPress={stepKey === 'payment' ? () => setDone(true) : next} style={styles.continue}>
            <Text style={styles.continueText}>
              {stepKey === 'payment' ? `Confirm visit ${money(total)}` : 'Continue →'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.continueOff}>
            <Text style={styles.continueOffText}>Continue →</Text>
          </View>
        )}
      </View>
    </Page>
  );
}

function QuestionBlock({ question, value, onChange }) {
  const choice = typeof value === 'object' ? value?.choice : value;

  return (
    <View style={styles.question}>
      <Text style={[styles.testName, question.urgent && styles.urgent]}>{question.prompt}</Text>
      {question.type === 'text' ? (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          placeholder="Type your answer"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      ) : null}
      {question.type === 'single' ? (
        <View style={styles.wrap}>
          {question.options.map((option) => (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.chip, choice === option && styles.chipOn]}
            >
              <Text style={styles.chipText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {['yes_no', 'yes_no_detail', 'yes_no_unsure', 'yes_no_unsure_detail', 'yes_no_unsure_multi'].includes(
        question.type
      ) ? (
        <View style={styles.wrap}>
          {(question.type.includes('unsure') ? ['Yes', 'No', 'Unsure'] : ['Yes', 'No']).map((option) => (
            <Pressable
              key={option}
              onPress={() => onChange({ choice: option })}
              style={[styles.chip, choice === option && styles.chipOn]}
            >
              <Text style={styles.chipText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {(question.type === 'yes_no_detail' || question.type === 'yes_no_unsure_detail') && choice === 'Yes' ? (
        <TextInput
          value={value?.detail || ''}
          onChangeText={(detail) => onChange({ choice: 'Yes', detail })}
          placeholder={question.detail_label || 'Add details'}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      ) : null}
      {question.type === 'yes_no_unsure_multi' && choice === 'Yes' ? (
        <View style={styles.wrap}>
          {question.options.map((option) => {
            const selected = value?.selected || [];
            const on = selected.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() =>
                  onChange({
                    choice: 'Yes',
                    selected: on ? selected.filter((item) => item !== option) : [...selected, option],
                  })
                }
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={styles.chipText}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Page({ children, onHome, onAbout }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={onHome} onAbout={onAbout} />
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

function Choice({ title, detail, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.test, on && styles.testOn]}>
      <View style={styles.testCopy}>
        <Text style={styles.testName}>{title}</Text>
        {detail ? <Text style={styles.testDetail}>{detail}</Text> : null}
      </View>
      {on ? <Text style={styles.mark}>✓</Text> : null}
    </Pressable>
  );
}

function Catalog({ title, items, picked, onToggle }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>Select one or more items.</Text>
      {items.map((item) => {
        const on = picked.includes(item.code);
        return (
          <Pressable key={item.code} onPress={() => onToggle(item.code)} style={[styles.test, on && styles.testOn]}>
            <View style={styles.testCopy}>
              <Text style={styles.testName}>{item.name}</Text>
              <Text style={styles.testDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.price}>{money(item.price)}</Text>
            <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.check}>✓</Text> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 36, paddingTop: 24, maxWidth: 860, width: '100%', alignSelf: 'center' },
  backButton: { alignSelf: 'flex-start', cursor: 'pointer', marginBottom: 4 },
  back: { fontFamily: font, color: colors.purple, fontWeight: '700', fontSize: 16 },
  step: { fontFamily: font, color: colors.muted, marginTop: 14 },
  bar: { flexDirection: 'row', gap: 6, marginTop: 8 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  segmentOn: { backgroundColor: colors.purple },
  title: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink, marginTop: 16 },
  copy: { fontFamily: font, color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 8 },
  error: { fontFamily: font, color: '#B42318', marginTop: 12, lineHeight: 22 },
  label: { fontFamily: font, color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 16 },
  notice: { marginTop: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14 },
  noticeTitle: { fontFamily: font, fontWeight: '700', color: colors.ink },
  noticeCopy: { fontFamily: font, color: colors.ink, marginTop: 6, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  outline: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  outlineText: { fontFamily: font, color: colors.ink, fontWeight: '700' },
  test: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  testOn: { borderColor: colors.purple, borderWidth: 1.5 },
  testCopy: { flex: 1 },
  testName: { fontFamily: font, fontWeight: '700', color: colors.ink, fontSize: 16 },
  urgent: { color: '#B42318' },
  testDetail: { fontFamily: font, color: colors.muted, marginTop: 4 },
  price: { fontFamily: font, fontWeight: '700', color: colors.ink },
  mark: { fontFamily: font, color: colors.purple, fontWeight: '700', fontSize: 18 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.purple },
  check: { color: colors.white, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  chipOn: { borderColor: colors.purple, borderWidth: 1.5 },
  chipText: { fontFamily: font, color: colors.ink },
  field: { flex: 1, minWidth: 220 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: font,
    color: colors.ink,
    outlineStyle: 'none',
  },
  answer: { fontFamily: font, fontWeight: '700', color: colors.ink, fontSize: 20, marginTop: 8 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: font, fontSize: 20, fontWeight: '700', color: colors.purple },
  question: { marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14 },
  navRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22, alignItems: 'center' },
  backOutline: {
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  backOutlineText: { fontFamily: font, color: colors.purple, fontWeight: '700' },
  continue: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  continueText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  continueOff: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  continueOffText: { fontFamily: font, color: colors.muted, fontWeight: '700' },
});
