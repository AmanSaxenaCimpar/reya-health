import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL, loadImaging, loadLabs, loadQuestionnaires, loadQuote, saveBooking } from '../api';
import { patientInfoProblems } from '../checks';
import { patientToken } from './PatientScreen';
import { SiteHeader } from '../SiteHeader';
import { colors, font, money } from '../theme';

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
      resolve(null);
      return;
    }
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
          type: file.type || 'application/octet-stream',
          content: result.includes(',') ? result.split(',')[1] : '',
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function detailLines(body) {
  return String(body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      bullet: !/[.!?]$/.test(line) && line.length < 140,
      text: line,
    }));
}

function answerText(value) {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  const parts = [];
  if (value.choice) {
    parts.push(value.choice);
  }
  if (value.detail && String(value.detail).trim()) {
    parts.push(String(value.detail).trim());
  }
  if (Array.isArray(value.selected) && value.selected.length) {
    parts.push(value.selected.join(', '));
  }
  return parts.join(' — ');
}

function testLine(item) {
  return {
    code: item.code,
    name: item.name,
    cpt: item.cpt || '',
    price: Number(item.price || 0),
    setup_fee: Number(item.setup_fee || 0),
  };
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

export function BookingScreen({ visit, onHome, onAbout, onBack, account, onPortal, onSignOut }) {
  const [labs, setLabs] = useState([]);
  const [imaging, setImaging] = useState([]);
  const [sections, setSections] = useState([]);
  const [generalSection, setGeneralSection] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [order, setOrder] = useState('');
  const [orderFile, setOrderFile] = useState(null);
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
    preferred: '',
  });
  const [quote, setQuote] = useState(null);
  const [holdStarted, setHoldStarted] = useState(0);
  const [stepKey, setStepKey] = useState('order');
  const [done, setDone] = useState(false);
  const [stored, setStored] = useState(false);
  const [orderLink, setOrderLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (stepKey === 'payment' && !holdStarted) {
      setHoldStarted(Date.now());
    }
  }, [stepKey, holdStarted]);

  useEffect(() => {
    if (!visit.zip) {
      return;
    }
    const service = visit.service === 'imaging' ? 'imaging' : 'lab';
    const business = visit.business || (service === 'imaging' ? 'reya-imaging' : 'reya-lab');
    loadQuote(visit.zip, service, business)
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [visit.zip, visit.service, visit.business]);

  useEffect(() => {
    const service = visit.service === 'imaging' ? 'imaging' : 'lab';
    const business = visit.business || (service === 'imaging' ? 'reya-imaging' : 'reya-lab');
    const loadTests = service === 'imaging' ? loadImaging : loadLabs;
    loadTests(business)
      .then((rows) => {
        if (service === 'imaging') {
          setImaging(rows);
          setLabs([]);
        } else {
          setLabs(rows);
          setImaging([]);
        }
      })
      .catch(() => setLoadError('Could not load tests from the Python API.'));
  }, [visit.service, visit.business]);

  useEffect(() => {
    if (!labPicked.length && !imagingPicked.length) {
      setSections([]);
      setGeneralSection(null);
      return;
    }
    const service = services.includes('imaging') ? 'imaging' : 'lab';
    loadQuestionnaires(
      labPicked,
      imagingPicked,
      service,
      visit.business || (service === 'imaging' ? 'reya-imaging' : 'reya-lab')
    )
      .then((payload) => {
        const rows = payload.sections || [];
        setGeneralSection(rows.find((section) => section.scope === 'shared') || null);
        setSections(rows.filter((section) => section.scope !== 'shared'));
      })
      .catch(() => setLoadError('Could not load questionnaires from the Python API.'));
  }, [labPicked, imagingPicked, services, visit.business]);

  const lockedService = visit.service === 'lab' || visit.service === 'imaging';
  const steps = ['order'];
  if (!lockedService) {
    steps.push('choose');
  }
  if (services.includes('lab')) {
    steps.push('lab');
  }
  if (services.includes('imaging')) {
    steps.push('imaging');
  }
  if (services.includes('lab') || services.includes('imaging')) {
    steps.push('questions');
  }
  steps.push('schedule', 'info', 'general', 'payment');

  const index = Math.max(steps.indexOf(stepKey), 0);
  const selectedLabs = services.includes('lab') ? labs.filter((item) => labPicked.includes(item.code)) : [];
  const selectedImaging = services.includes('imaging') ? imaging.filter((item) => imagingPicked.includes(item.code)) : [];
  const chosen = [...selectedLabs, ...selectedImaging];
  const serviceFee = chosen.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const setupTotal = selectedImaging.reduce((sum, item) => sum + Number(item.setup_fee || 0), 0);
  const travelFee = Number(quote?.travel_total || 0);
  const total = serviceFee + setupTotal + travelFee;
  const allQuestions = sections.flatMap((section) => section.questions);
  const questionsDone = allQuestions.length > 0 && allQuestions.every((question) => answered(question, answers));
  const generalQuestions = generalSection?.questions || [];
  const generalDone =
    generalQuestions.length > 0 && generalQuestions.every((question) => answered(question, answers));
  const urgentHit = generalQuestions.some(
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

  function selectService(key) {
    setServices([key]);
    if (key === 'lab') {
      setImagingPicked([]);
    }
    if (key === 'imaging') {
      setLabPicked([]);
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

  const infoProblems = patientInfoProblems(info);
  const infoReady = Object.values(infoProblems).every((item) => !item);
  const canContinue = {
    order: order === 'no' || (order === 'yes' && orderFile?.content),
    choose: services.length > 0,
    lab: labPicked.length > 0,
    imaging: imagingPicked.length > 0,
    questions: questionsDone,
    schedule: Boolean(date && time),
    info: infoReady,
    general: generalDone && !urgentHit,
    payment: true,
  }[stepKey];

  function confirmVisit() {
    setSaving(true);
    setSaveError('');
    if (labPicked.length && imagingPicked.length) {
      setSaveError('Lab and imaging are separate businesses. Book only one service.');
      setSaving(false);
      return;
    }
    const sectionsToSave = [...sections, generalSection].filter(Boolean).map((section) => ({
      title: section.title,
      items: (section.questions || []).map((question) => ({
        prompt: question.prompt,
        answer: answerText(answers[question.id]),
      })),
    }));
    saveBooking({
      company: visit.company,
      business: visit.business || '',
      zip: visit.zip,
      address: visit.address,
      order,
      order_file: order === 'yes' ? orderFile?.name || '' : '',
      order_content: order === 'yes' ? orderFile?.content || '' : '',
      order_content_type: order === 'yes' ? orderFile?.type || '' : '',
      appointment_date: date ? formatDate(date) : '',
      appointment_time: time,
      service: services.includes('imaging') ? 'imaging' : 'lab',
      labs: services.includes('lab') ? selectedLabs.map(testLine) : [],
      imaging: services.includes('imaging') ? selectedImaging.map(testLine) : [],
      questions: sectionsToSave,
      info,
      service_fee: serviceFee,
      setup_fee: setupTotal,
      total,
    }, patientToken())
      .then((result) => {
        setStored(Boolean(result.saved));
        setOrderLink(result.order_id ? `${API_URL}/orders/${result.order_id}` : '');
        setDone(true);
      })
      .catch((error) => {
        setSaveError(error.message || 'Could not save this visit to SharePoint.');
      })
      .finally(() => setSaving(false));
  }

  if (done) {
    return (
      <Page onHome={onHome} onAbout={onAbout} account={account} onPortal={onPortal} onSignOut={onSignOut}>
        <Pressable onPress={() => setDone(false)} style={styles.backButton}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Visit requested</Text>
        <Text style={styles.copy}>
          {visit.company}. {chosen.map((item) => item.name).join(', ')} at home, ZIP {visit.zip}.{' '}
          {date ? formatDate(date) : ''} {time}.
        </Text>
        <Text style={styles.copy}>
          Total {money(total)}. Your order is saved with this visit.{' '}
          {stored
            ? 'The visit and the order were sent to SharePoint.'
            : 'Power Automate is not connected yet, so this visit was not stored in SharePoint.'}
        </Text>
        {orderLink ? (
          <Pressable onPress={() => window.open(orderLink, '_blank', 'noopener')} style={styles.outline}>
            <Text style={styles.outlineText}>Open your order</Text>
          </Pressable>
        ) : null}
        <View style={styles.navRow}>
          <Pressable onPress={onBack} style={styles.backOutline}>
            <Text style={styles.backOutlineText}>← Back to Find care</Text>
          </Pressable>
        </View>
      </Page>
    );
  }

  return (
    <Page onHome={onHome} onAbout={onAbout} account={account} onPortal={onPortal} onSignOut={onSignOut}>
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
            detail="We will create a PDF order from this visit"
            on={order === 'no'}
            onPress={() => {
              setOrder('no');
              setOrderFile(null);
            }}
          />
          {order === 'yes' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Upload the order</Text>
              <Text style={styles.noticeCopy}>
                Use a PDF or a photo. It stays with this visit and is sent with the booking.
              </Text>
              <Pressable onPress={async () => setOrderFile(await pickFile())} style={styles.outline}>
                <Text style={styles.outlineText}>{orderFile?.name ? 'Replace file' : 'Upload PDF or image'}</Text>
              </Pressable>
              {orderFile?.name ? <Text style={styles.copy}>{orderFile.name}</Text> : null}
            </View>
          ) : null}
          {order === 'no' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>We will create the order</Text>
              <Text style={styles.noticeCopy}>
                After you finish the visit, we make a PDF requisition from the patient details and tests, keep it with this visit, and send that order with the booking.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {stepKey === 'choose' ? (
        <View>
          <Text style={styles.title}>Choose a service</Text>
          <Text style={styles.copy}>
            Choose laboratory or imaging. They are separate businesses and cannot be booked together.
          </Text>
          <Choice
            title="Laboratory"
            detail="Top lab panels and individual tests"
            on={services.includes('lab')}
            onPress={() => selectService('lab')}
          />
          <Choice
            title="Imaging"
            detail="X-ray, EKG, and ultrasound"
            on={services.includes('imaging')}
            onPress={() => selectService('imaging')}
          />
        </View>
      ) : null}

      {stepKey === 'lab' ? (
        <Catalog
          title="Lab tests"
          items={labs.map((item) => ({
            code: item.code,
            name: item.name,
            detail: `${item.topic || 'Lab'} · ${item.code} · CPT ${item.cpt}`,
            summary: item.summary,
            sections: item.sections || [],
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
            detail: `${item.topic || item.category} · CPT ${item.cpt}`,
            summary: item.summary,
            sections: item.sections || [],
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
            These questions are specific to the lab and imaging tests you selected.
          </Text>
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
          <Text style={styles.copy}>Choose a date on the calendar, then a time. Same-day and next-day visits are not available. Times are Central Time.</Text>
          <MonthCalendar date={date} onSelect={setDate} />
          <Text style={styles.label}>Time</Text>
          <View style={styles.wrap}>
            {timeSlots().map((item) => (
              <Pressable key={item} onPress={() => setTime(item)} style={[styles.chip, time === item && styles.chipOn]}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {stepKey === 'info' ? (
        <View>
          <Text style={styles.title}>Your information</Text>
          <Text style={styles.copy}>Patients must be 18 or older. Use a real email and a 10-digit phone number.</Text>
          <View style={styles.row}>
            <Field label="Patient first name" value={info.first} error={info.first ? infoProblems.first : ''} onChangeText={(first) => setInfo({ ...info, first })} />
            <Field label="Patient last name" value={info.last} error={info.last ? infoProblems.last : ''} onChangeText={(last) => setInfo({ ...info, last })} />
          </View>
          <Field label="Date of birth" value={info.dob} placeholder="mm/dd/yyyy" error={info.dob ? infoProblems.dob : ''} onChangeText={(dob) => setInfo({ ...info, dob })} />
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
          <Field
            label="Preferred first name"
            value={info.preferred}
            error={info.preferred ? infoProblems.preferred : ''}
            onChangeText={(preferred) => setInfo({ ...info, preferred })}
          />
          <Field label="Phone" value={info.phone} placeholder="(312) 555-0100" error={info.phone ? infoProblems.phone : ''} onChangeText={(phone) => setInfo({ ...info, phone })} />
          <Field label="Email" value={info.email} placeholder="name@email.com" autoCapitalize="none" error={info.email ? infoProblems.email : ''} onChangeText={(email) => setInfo({ ...info, email })} />
          {!infoReady && (info.first || info.last || info.dob || info.phone || info.email) ? (
            <Text style={styles.error}>{Object.values(infoProblems).find(Boolean)}</Text>
          ) : null}
        </View>
      ) : null}

      {stepKey === 'general' ? (
        <View>
          <Text style={styles.title}>General questionnaire</Text>
          <Text style={styles.copy}>These questions apply to every visit.</Text>
          {urgentHit ? (
            <Text style={styles.error}>
              Severe or rapidly worsening symptoms were reported. Do not continue online booking.
              Call 911 or seek emergency care.
            </Text>
          ) : null}
          {generalSection ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{generalSection.title}</Text>
              {generalQuestions.map((question) => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(patch) => setAnswer(question, patch)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {stepKey === 'payment' ? (
        <ReviewDetails
          visit={visit}
          chosen={chosen}
          date={date}
          time={time}
          info={info}
          serviceName={services.includes('imaging') ? 'Imaging' : 'Lab'}
          orderNote={order === 'yes' ? orderFile?.name || 'Uploaded order' : 'We will create this order'}
          total={total}
          holdStarted={holdStarted}
          saveError={saveError}
          onEdit={go}
        />
      ) : null}

      <View style={styles.navRow}>
        <Pressable onPress={back} style={styles.backOutline}>
          <Text style={styles.backOutlineText}>← Back</Text>
        </Pressable>
        {saving ? (
          <View style={styles.continueOff}>
            <Text style={styles.continueOffText}>Saving to SharePoint…</Text>
          </View>
        ) : canContinue ? (
          <Pressable onPress={stepKey === 'payment' ? confirmVisit : next} style={styles.continue}>
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

function DetailBody({ body }) {
  const lines = detailLines(body);
  return (
    <View style={styles.dropdownBody}>
      {lines.map((line, index) =>
        line.bullet ? (
          <View key={`${line.text}-${index}`} style={styles.bulletRow}>
            <Text style={styles.bulletMark}>•</Text>
            <Text style={styles.bulletText}>{line.text}</Text>
          </View>
        ) : (
          <Text key={`${line.text}-${index}`} style={styles.paragraph}>
            {line.text}
          </Text>
        )
      )}
    </View>
  );
}

function ReviewDetails({
  visit,
  chosen,
  date,
  time,
  info,
  serviceName,
  orderNote,
  total,
  holdStarted,
  saveError,
  onEdit,
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, 15 * 60 - Math.floor((now - (holdStarted || now)) / 1000));
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const legal = [info.first, info.last].filter(Boolean).join(' ');
  return (
    <View>
      <Text style={styles.reviewTitle}>Review Appointment Details</Text>
      <View style={styles.hold}>
        <Text style={styles.holdMark}>!</Text>
        <Text style={styles.holdText}>
          Appointment time is reserved for {minutes}:{seconds} minutes.
        </Text>
      </View>
      <ReviewSection
        title={`${serviceName} Location and Service Type`}
        onEdit={() => onEdit(serviceName === 'Imaging' ? 'imaging' : 'lab')}
      >
        <ReviewRow label="Location" value={visit.address || visit.zip} />
        <ReviewRow label="Service Type" value={chosen.map((item) => item.name).join(', ')} />
        <ReviewRow label="Order" value={orderNote} />
      </ReviewSection>
      <ReviewSection title="Appointment Date and Time" onEdit={() => onEdit('schedule')}>
        <ReviewRow label="Appointment Date" value={date ? formatDate(date) : ''} />
        <ReviewRow label="Appointment Time" value={time} />
      </ReviewSection>
      <ReviewSection title="Patient Details" onEdit={() => onEdit('info')}>
        <ReviewRow label="Preferred First Name" value={info.preferred || info.first} />
        <ReviewRow label="Legal Name" value={legal} />
        <ReviewRow label="Date of Birth" value={info.dob} />
        <ReviewRow label="Sex" value={info.gender} />
        <ReviewRow label="Address" value={visit.address || visit.zip} />
      </ReviewSection>
      <View style={styles.feeBox}>
        <Text style={styles.answer}>Total {money(total)}</Text>
      </View>
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
    </View>
  );
}

function ReviewSection({ title, onEdit, children }) {
  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewHeading}>{title}</Text>
        <Pressable onPress={onEdit}>
          <Text style={styles.editLink}>Edit ›</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function ReviewRow({ label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function timeSlots() {
  const slots = [];
  for (let hour = 8; hour <= 16; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 16 && minute === 30) {
        continue;
      }
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const shown = hour % 12 || 12;
      slots.push(`${shown}:${String(minute).padStart(2, '0')} ${suffix}`);
    }
  }
  return slots;
}

function MonthCalendar({ date, onSelect }) {
  const earliest = startOfDay(addDays(new Date(), 2));
  const latest = startOfDay(addDays(earliest, 60));
  const [cursor, setCursor] = useState(date || earliest);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1))];
  const title = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHead}>
        <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} style={styles.calendarNav}>
          <Text style={styles.calendarNavText}>‹</Text>
        </Pressable>
        <Text style={styles.calendarTitle}>{title}</Text>
        <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} style={styles.calendarNav}>
          <Text style={styles.calendarNavText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calendarWeek}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
          <Text key={`${label}${index}`} style={styles.calendarDow}>{label}</Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {cells.map((item, index) => {
          if (!item) {
            return <View key={`empty-${index}`} style={styles.calendarDay} />;
          }
          const day = startOfDay(item);
          const open = day >= earliest && day <= latest;
          const selected = date && startOfDay(date).getTime() === day.getTime();
          return (
            <Pressable
              key={item.toISOString()}
              disabled={!open}
              onPress={() => onSelect(item)}
              style={[styles.calendarDay, selected && styles.calendarDayOn, !open && styles.calendarDayOff]}
            >
              <Text style={[styles.calendarDayText, selected && styles.calendarDayTextOn, !open && styles.calendarDayMuted]}>{item.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Page({ children, onHome, onAbout, account, onPortal, onSignOut }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={onHome} onAbout={onAbout} onPortal={onPortal} account={account} onSignOut={onSignOut} />
      {account ? (
        <View style={styles.signedBar}>
          <Text style={styles.signedText}>Booking as {account.name}</Text>
        </View>
      ) : null}
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
  const [openCode, setOpenCode] = useState(null);
  const [openSection, setOpenSection] = useState('');

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>
        Select one or more items. Open test details to read what the test includes before you book.
      </Text>
      {items.map((item) => {
        const on = picked.includes(item.code);
        const detailsOpen = openCode === item.code;
        return (
          <View key={item.code} style={[styles.testCard, on && styles.testOn]}>
            <Pressable onPress={() => onToggle(item.code)} style={styles.testRow}>
              <View style={styles.testCopy}>
                <Text style={styles.testName}>{item.name}</Text>
                <Text style={styles.testDetail}>{item.detail}</Text>
                {item.summary ? <Text style={styles.summary}>{item.summary}</Text> : null}
              </View>
              <Text style={styles.price}>{money(item.price)}</Text>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.check}>✓</Text> : null}</View>
            </Pressable>
            {item.sections?.length ? (
              <View>
                <Pressable
                  onPress={() => {
                    setOpenCode(detailsOpen ? null : item.code);
                    setOpenSection('');
                  }}
                  style={styles.detailsToggle}
                >
                  <Text style={styles.detailsToggleText}>
                    {detailsOpen ? 'Hide test details' : 'Test details'}
                  </Text>
                </Pressable>
                {detailsOpen
                  ? item.sections.map((section) => {
                      const sectionKey = `${item.code}:${section.title}`;
                      const sectionOn = openSection === sectionKey;
                      return (
                        <View key={sectionKey} style={styles.dropdown}>
                          <Pressable
                            onPress={() => setOpenSection(sectionOn ? '' : sectionKey)}
                            style={styles.dropdownHead}
                          >
                            <Text style={styles.dropdownTitle}>{section.title}</Text>
                            <Text style={styles.dropdownMark}>{sectionOn ? '−' : '+'}</Text>
                          </Pressable>
                          {sectionOn ? <DetailBody body={section.body} /> : null}
                        </View>
                      );
                    })
                  : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Field({ label, error, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  testCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  summary: {
    fontFamily: font,
    color: colors.ink,
    marginTop: 8,
    lineHeight: 22,
  },
  detailsToggle: {
    alignSelf: 'flex-start',
    marginTop: 12,
    cursor: 'pointer',
  },
  detailsToggleText: {
    fontFamily: font,
    color: colors.purple,
    fontWeight: '700',
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  dropdownTitle: {
    fontFamily: font,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  dropdownMark: {
    fontFamily: font,
    color: colors.purple,
    fontWeight: '700',
    fontSize: 18,
  },
  dropdownBody: {
    fontFamily: font,
    color: colors.ink,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingBottom: 12,
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
  chipOn: { borderColor: colors.purple, borderWidth: 1.5, backgroundColor: '#EFE7F6' },
  signedBar: { backgroundColor: '#EFE7F6', paddingVertical: 8, paddingHorizontal: 28 },
  signedText: { fontFamily: font, color: colors.ink, fontWeight: '600' },
  calendar: { marginTop: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, maxWidth: 420, backgroundColor: colors.white },
  calendarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { fontFamily: font, fontWeight: '700', color: colors.ink, fontSize: 16 },
  calendarNav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F3F8' },
  calendarNavText: { fontFamily: font, fontSize: 22, color: colors.ink },
  calendarWeek: { flexDirection: 'row', marginTop: 12 },
  calendarDow: { width: '14.28%', textAlign: 'center', fontFamily: font, color: colors.muted, fontSize: 12, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  calendarDayOn: { backgroundColor: colors.purple },
  calendarDayOff: { opacity: 0.35 },
  calendarDayText: { fontFamily: font, color: colors.ink, fontWeight: '600' },
  calendarDayTextOn: { color: colors.white },
  calendarDayMuted: { color: colors.muted },
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
  reviewTitle: { fontFamily: font, fontSize: 32, fontWeight: '700', color: colors.ink },
  hold: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E6B325',
    borderRadius: 12,
    overflow: 'hidden',
  },
  holdMark: {
    backgroundColor: '#F5C518',
    color: colors.ink,
    fontFamily: font,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  holdText: { fontFamily: font, color: colors.ink, flex: 1, paddingRight: 12 },
  reviewSection: { marginTop: 26 },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D6DDF5',
    paddingBottom: 8,
  },
  reviewHeading: { fontFamily: font, color: '#3156C9', fontSize: 18, fontWeight: '700' },
  editLink: { fontFamily: font, color: '#3156C9', fontWeight: '700' },
  reviewRow: { flexDirection: 'row', gap: 16, paddingVertical: 10 },
  reviewLabel: { fontFamily: font, fontWeight: '700', color: colors.ink, width: 180 },
  reviewValue: { fontFamily: font, color: colors.ink, flex: 1 },
  feeBox: { marginTop: 22 },
  bulletRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  bulletMark: { fontFamily: font, color: colors.ink, lineHeight: 22 },
  bulletText: { fontFamily: font, color: colors.ink, lineHeight: 22, flex: 1 },
  paragraph: { fontFamily: font, color: colors.ink, lineHeight: 22, marginTop: 8 },
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
