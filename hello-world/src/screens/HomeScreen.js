import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { confirmCoverage, loadCompanies } from '../api';
import { HEALTHIE_EMBED_URL } from '../BookingFrame';
import { AREA_LABEL, checkCoverage, locateZip } from '../coverage';
import { Icon } from '../icons';
import { SiteHeader } from '../SiteHeader';
import { colors, font, serviceLabels } from '../theme';

const offeredServices = [
  {
    key: 'lab',
    title: 'Lab',
    detail: 'Laboratory testing from registered companies on Reya Health.',
  },
  {
    key: 'imaging',
    title: 'Imaging',
    detail: 'Imaging and EKG from registered companies on Reya Health.',
  },
  {
    key: 'psych',
    title: 'Psychiatry televisits',
    detail: 'Psychiatry televisits from registered companies on Reya Health.',
  },
  {
    key: 'primary',
    title: 'Primary Care Televisit',
    detail: 'Primary care televisits from registered companies on Reya Health.',
  },
];

const serviceChoices = Object.entries(serviceLabels).map(([key, label]) => ({ key, label }));
const CHICAGO_ZIP = '60601';

export function HomeScreen({ onAbout, onBook, onCompanyBook }) {
  const scrollRef = useRef(null);
  const [intent, setIntent] = useState('lab');
  const [place, setPlace] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [busy, setBusy] = useState(false);

  function scrollToSearch(serviceKey) {
    if (serviceKey) {
      setIntent(serviceKey);
    }
    setMenuOpen(false);
    if (typeof document !== 'undefined') {
      document.getElementById('coverage-check')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openService(service) {
    setPlace('home');
    scrollToSearch(service.key);

    if (service.key === 'primary' || service.key === 'psych') {
      setAddress(CHICAGO_ZIP);
      runCheck(() => checkCoverage(CHICAGO_ZIP), service.key, 'home');
      return;
    }

    if (result?.served) {
      showCompanies(service.key).catch(() => {
        setStatus('The Python service is not running, so registered companies could not be loaded.');
      });
    }
  }

  async function showCompanies(service) {
    const rows = await loadCompanies(service);
    setCompanies(rows);
  }

  async function runCheck(lookup, serviceKey = intent, placeKey = place) {
    if (placeKey === 'center') {
      setResult(null);
      setCompanies([]);
      setStatus('Service center booking is coming soon. Choose At home to search.');
      return;
    }
    setBusy(true);
    setResult(null);
    setCompanies([]);
    setStatus('');
    setMenuOpen(false);
    try {
      const coverage = await lookup();
      if (coverage.unknown || !coverage.zip) {
        setStatus('Enter a full address or a 5-digit ZIP code.');
        return;
      }
      const decision = await confirmCoverage(coverage.zip);
      setAddress(coverage.label);
      setResult({ ...coverage, served: decision.served, area: decision.area });
      if (decision.served) {
        await showCompanies(serviceKey);
      }
    } catch (error) {
      setStatus(
        error.message === 'denied'
          ? 'Location permission was blocked. Enter an address or ZIP code.'
          : error.message === 'api'
            ? 'The Python service is not running, so registered companies could not be loaded.'
            : 'Enter an address or ZIP code.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseService(key) {
    setIntent(key);
    setMenuOpen(false);
    setCompanies([]);
    if (place === 'home' && result?.served) {
      try {
        await showCompanies(key);
      } catch (error) {
        setStatus('The Python service is not running, so registered companies could not be loaded.');
      }
    }
  }

  function choosePlace(next) {
    setPlace(next);
    setResult(null);
    setCompanies([]);
    setStatus(next === 'center' ? 'Service center booking is coming soon.' : '');
  }

  function bookCompany(company) {
    const visit = {
      service: intent,
      address: result.label,
      zip: result.zip,
      company: company.name,
      place: 'home',
      book: company.book,
      url: company.url || HEALTHIE_EMBED_URL,
    };
    if (company.book === 'iframe' || intent === 'psych' || intent === 'primary') {
      onCompanyBook(visit);
      return;
    }
    onBook(visit);
  }

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.content}>
      <SiteHeader onHome={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} onAbout={onAbout} />
      <View style={styles.body}>
        <Text style={styles.title}>Reya Health</Text>
        <Text style={styles.copy}>
          Companies register on Reya Health to offer Lab, Imaging, Psychiatry televisits, and
          Primary Care Televisit. Choose a service below, then choose At home or Service center when
          you search.
        </Text>

        <View style={styles.serviceRow}>
          {offeredServices.map((service) => (
            <View key={service.key} style={styles.infoCard}>
              <View style={styles.cardCopy}>
                <Text style={styles.infoTitle}>{service.title}</Text>
                <Text style={styles.infoDetail}>{service.detail}</Text>
              </View>
              <Pressable onPress={() => openService(service)} style={styles.book}>
                <Text style={styles.bookText}>Book</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View nativeID="coverage-check" style={styles.check}>
          <Text style={styles.checkTitle}>Find care</Text>
          <Text style={styles.copy}>
            Choose At home or Service center, select a service, then enter your address or ZIP code.
            Registered companies for that service appear when care is available.
          </Text>

          <View style={styles.placeRow}>
            <Pressable
              onPress={() => choosePlace('home')}
              style={[styles.placeButton, place === 'home' && styles.placeButtonOn]}
            >
              <Text style={[styles.placeText, place === 'home' && styles.placeTextOn]}>At home</Text>
            </Pressable>
            <Pressable
              onPress={() => choosePlace('center')}
              style={[styles.placeButton, place === 'center' && styles.placeButtonOn]}
            >
              <Text style={[styles.placeText, place === 'center' && styles.placeTextOn]}>
                Service center
              </Text>
              <Text style={[styles.comingSoon, place === 'center' && styles.comingSoonOn]}>
                Coming soon
              </Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.dropdown}>
              <Pressable onPress={() => setMenuOpen((open) => !open)} style={styles.dropdownButton}>
                <Text style={styles.dropdownText}>{serviceLabels[intent]}</Text>
                <Text style={styles.caret}>▾</Text>
              </Pressable>
              {menuOpen ? (
                <View style={styles.menu}>
                  {serviceChoices.map((choice) => (
                    <Pressable
                      key={choice.key}
                      onPress={() => chooseService(choice.key)}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuItemText}>{choice.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => runCheck(locateZip)} style={styles.locate}>
              <Icon name="locate" size={18} />
              <Text style={styles.locateText}>Locate Me</Text>
            </Pressable>
            <TextInput
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setResult(null);
                setCompanies([]);
              }}
              placeholder="Enter Address or Zipcode"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable onPress={() => runCheck(() => checkCoverage(address))} style={styles.search}>
              <Text style={styles.searchText}>{busy ? 'Checking' : 'Check'}</Text>
            </Pressable>
          </View>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          {place === 'home' && result?.served ? (
            <View style={styles.answer}>
              <Text style={styles.answerTitle}>Yes. Care is available for this address.</Text>
              <Text style={styles.copy}>ZIP {result.zip} is inside the current range.</Text>
              <Text style={styles.listTitle}>
                Registered companies that offer {serviceLabels[intent]}
              </Text>
              {companies.map((company) => (
                <Pressable key={company.id} onPress={() => bookCompany(company)} style={styles.company}>
                  <Text style={styles.infoTitle}>{company.name}</Text>
                  <View style={styles.marks}>
                    {company.services.map((key) => (
                      <Text key={key} style={styles.mark}>
                        ✓ {serviceLabels[key] || key}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.clickToBook}>
                    <Text style={styles.clickToBookText}>Click to book</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
          {place === 'home' && result && !result.served ? (
            <View style={styles.answer}>
              <Text style={styles.answerTitle}>No. This address is outside the current range.</Text>
              <Text style={styles.copy}>Coverage is currently limited to {result.area || AREA_LABEL}.</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>
          For non-emergency services only. If you have a medical emergency, call 911.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { paddingBottom: 64 },
  body: { paddingHorizontal: 36, paddingTop: 36, maxWidth: 920, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font, color: colors.ink, fontSize: 40, fontWeight: '700' },
  copy: { fontFamily: font, color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 12 },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 28, alignItems: 'stretch' },
  infoCard: {
    width: 280,
    height: 196,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
  },
  cardCopy: { height: 108 },
  infoTitle: { fontFamily: font, fontSize: 20, fontWeight: '700', color: colors.ink },
  infoDetail: { fontFamily: font, color: colors.muted, marginTop: 6, fontSize: 15, lineHeight: 22 },
  book: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  bookText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  clickToBook: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clickToBookText: {
    fontFamily: font,
    color: colors.white,
    fontWeight: '700',
  },
  check: { marginTop: 56, paddingTop: 28, borderTopWidth: 1, borderTopColor: colors.line },
  checkTitle: { fontFamily: font, fontSize: 28, fontWeight: '700', color: colors.ink },
  placeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  placeButton: {
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
    cursor: 'pointer',
  },
  placeButtonOn: { backgroundColor: colors.purple },
  placeText: { fontFamily: font, color: colors.purple, fontWeight: '700', fontSize: 16 },
  placeTextOn: { color: colors.white },
  comingSoon: { fontFamily: font, color: colors.muted, fontSize: 12, marginTop: 4 },
  comingSoonOn: { color: colors.white },
  searchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 14,
    padding: 8,
    zIndex: 5,
  },
  dropdown: { minWidth: 230, zIndex: 6 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  dropdownText: { fontFamily: font, color: colors.purple, fontWeight: '700', fontSize: 14 },
  caret: { fontFamily: font, color: colors.purple, fontSize: 14 },
  menu: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12, cursor: 'pointer' },
  menuItemText: { fontFamily: font, color: colors.ink },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  locateText: { fontFamily: font, color: colors.purple, fontWeight: '600' },
  input: {
    flex: 1,
    minWidth: 180,
    fontFamily: font,
    fontSize: 15,
    color: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 10,
    outlineStyle: 'none',
  },
  search: {
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    cursor: 'pointer',
  },
  searchText: { fontFamily: font, color: colors.white, fontWeight: '700' },
  status: { fontFamily: font, color: colors.ink, marginTop: 12 },
  answer: { marginTop: 18 },
  answerTitle: { fontFamily: font, fontSize: 22, fontWeight: '700', color: colors.ink },
  listTitle: { fontFamily: font, fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 18 },
  company: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderRadius: 14,
    padding: 16,
    cursor: 'pointer',
  },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  mark: { fontFamily: font, color: colors.purple, fontWeight: '700' },
  footer: { fontFamily: font, color: colors.muted, marginTop: 40, fontSize: 13 },
});
