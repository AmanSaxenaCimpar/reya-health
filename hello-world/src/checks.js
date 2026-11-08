export function checkName(value, label) {
  const name = String(value || '').trim();
  if (name.length < 2 || !/^[A-Za-z][A-Za-z .'-]*$/.test(name)) {
    return `Enter a ${label} using letters.`;
  }
  return '';
}

export function checkEmail(value) {
  const email = String(value || '').trim();
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    return 'Enter a valid email, like name@email.com.';
  }
  return '';
}

export function checkPhone(value, required = true) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return required ? 'Enter a 10-digit phone number.' : '';
  }
  if (digits.length !== 10) {
    return 'Enter a 10-digit phone number.';
  }
  return '';
}

export function checkZip(value, required = false) {
  const zip = String(value || '').trim();
  if (!zip) {
    return required ? 'Enter a 5-digit ZIP code.' : '';
  }
  if (!/^\d{5}$/.test(zip)) {
    return 'Enter a 5-digit ZIP code.';
  }
  return '';
}

export function checkState(value) {
  const state = String(value || '').trim();
  if (!state) {
    return '';
  }
  if (!/^[A-Za-z]{2}$/.test(state)) {
    return 'Enter the state as two letters, like IL.';
  }
  return '';
}

export function checkAdultDob(value, required = true) {
  const text = String(value || '').trim();
  if (!text) {
    return required ? 'Enter the date of birth as mm/dd/yyyy.' : '';
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return 'Enter the date of birth as mm/dd/yyyy.';
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'That date of birth is not a real date.';
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day);
  if (beforeBirthday) {
    age -= 1;
  }
  if (age < 18) {
    return 'Patients must be 18 or older.';
  }
  if (age > 120) {
    return 'Check the date of birth.';
  }
  return '';
}

export function patientInfoProblems(info) {
  return {
    first: checkName(info.first, 'first name'),
    last: checkName(info.last, 'last name'),
    dob: checkAdultDob(info.dob),
    gender: info.gender ? '' : 'Choose a gender.',
    relationship: info.relationship ? '' : 'Choose who the visit is for.',
    preferred: info.preferred ? checkName(info.preferred, 'preferred name') : '',
    phone: checkPhone(info.phone),
    email: checkEmail(info.email),
  };
}

export function profileProblems(profile) {
  return {
    phone: checkPhone(profile.phone, false),
    dob: checkAdultDob(profile.dob, false),
    zip: checkZip(profile.zip),
    state: checkState(profile.state),
    pharmacy_phone: checkPhone(profile.pharmacy_phone, false),
  };
}
