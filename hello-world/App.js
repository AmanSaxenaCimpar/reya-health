import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AdminScreen } from './src/screens/AdminScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { AccessGate, hasAccess } from './src/screens/AccessGate';
import { BookingScreen } from './src/screens/BookingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PatientScreen, forgetPatient, patientName, patientToken } from './src/screens/PatientScreen';
import { VisitScreen } from './src/screens/VisitScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(() => hasAccess());
  const [screen, setScreen] = useState({ name: 'home' });
  const [account, setAccount] = useState(() => (patientToken() && patientName() ? { name: patientName() } : null));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const finish = params.get('finish_email');
    if (!finish) {
      return;
    }
    setScreen({ name: 'portal', finishEmail: finish });
    params.delete('finish_email');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    document.title = 'Reya Health';
    if (document.getElementById('reya-fonts')) {
      return;
    }
    const link = document.createElement('link');
    link.id = 'reya-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Material+Icons&display=swap';
    document.head.appendChild(link);
  }, []);

  const home = () => setScreen({ name: 'home' });
  const about = () => setScreen({ name: 'about' });
  const office = () => setScreen({ name: 'office' });
  const portal = () => setScreen({ name: 'portal' });
  const signOut = () => {
    forgetPatient();
    setAccount(null);
    setScreen({ name: 'home' });
  };
  const header = { account, onPortal: portal, onSignOut: signOut };
  const book = (visit) => {
    setScreen({ name: 'booking', visit });
  };

  if (!unlocked) {
    return (
      <View style={styles.app}>
        <StatusBar style="dark" />
        <AccessGate onUnlock={() => setUnlocked(true)} />
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      {screen.name === 'home' ? (
        <HomeScreen
          onAbout={about}
          onPortal={portal}
          onBook={book}
          onCompanyBook={(visit) => setScreen({ name: 'visit', visit })}
          account={account}
          onSignOut={signOut}
        />
      ) : null}
      {screen.name === 'about' ? <AboutScreen onHome={home} onOffice={office} {...header} /> : null}
      {screen.name === 'office' ? <AdminScreen onHome={home} onAbout={about} {...header} /> : null}
      {screen.name === 'portal' ? (
        <PatientScreen
          visit={screen.visit}
          finishEmail={screen.finishEmail || ''}
          onHome={home}
          onAbout={about}
          onBook={book}
          account={account}
          onAccount={setAccount}
          onSignOut={signOut}
        />
      ) : null}
      {screen.name === 'visit' ? (
        <VisitScreen visit={screen.visit} onHome={home} onAbout={about} onBack={home} {...header} />
      ) : null}
      {screen.name === 'booking' ? (
        <BookingScreen
          visit={screen.visit}
          onHome={home}
          onAbout={about}
          onBack={home}
          onAccount={setAccount}
          {...header}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
