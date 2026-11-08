import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AdminScreen } from './src/screens/AdminScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { AccessGate, hasAccess } from './src/screens/AccessGate';
import { BookingScreen } from './src/screens/BookingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PatientScreen, patientToken } from './src/screens/PatientScreen';
import { VisitScreen } from './src/screens/VisitScreen';

export default function App() {
  const [unlocked, setUnlocked] = useState(() => hasAccess());
  const [screen, setScreen] = useState({ name: 'home' });

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
  const book = (visit) => {
    if (!patientToken()) {
      setScreen({ name: 'portal', visit });
      return;
    }
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
          onOffice={office}
          onPortal={portal}
          onBook={book}
          onCompanyBook={(visit) => setScreen({ name: 'visit', visit })}
        />
      ) : null}
      {screen.name === 'about' ? <AboutScreen onHome={home} /> : null}
      {screen.name === 'office' ? <AdminScreen onHome={home} onAbout={about} /> : null}
      {screen.name === 'portal' ? (
        <PatientScreen visit={screen.visit} onHome={home} onAbout={about} onOffice={office} onBook={book} />
      ) : null}
      {screen.name === 'visit' ? (
        <VisitScreen visit={screen.visit} onHome={home} onAbout={about} onBack={home} />
      ) : null}
      {screen.name === 'booking' ? (
        <BookingScreen visit={screen.visit} onHome={home} onAbout={about} onBack={home} />
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
