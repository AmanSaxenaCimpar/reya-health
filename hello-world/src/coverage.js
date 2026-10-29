export const AREA_LABEL = 'Chicago-area ZIP codes 60000–60899';

export function zipInRange(zip) {
  return /^60[0-8]\d{2}$/.test(zip);
}

export function zipFromText(text) {
  const match = String(text).match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
}

export async function checkCoverage(text) {
  const direct = zipFromText(text);
  if (direct) {
    return { zip: direct, served: zipInRange(direct), label: text.trim() };
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us&limit=1&q=${encodeURIComponent(text)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    throw new Error('lookup failed');
  }
  const rows = await response.json();
  const zip = String(rows[0]?.address?.postcode || '').slice(0, 5);
  if (!/^\d{5}$/.test(zip)) {
    return { zip: '', served: false, unknown: true, label: text.trim() };
  }
  return { zip, served: zipInRange(zip), label: rows[0].display_name || text.trim() };
}

export function locateZip() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) {
            throw new Error('lookup failed');
          }
          const data = await response.json();
          const zip = String(data.address?.postcode || '').slice(0, 5);
          resolve({
            zip,
            served: zipInRange(zip),
            label: data.display_name || 'Current location',
            unknown: !/^\d{5}$/.test(zip),
          });
        } catch (error) {
          reject(error);
        }
      },
      () => reject(new Error('denied'))
    );
  });
}
