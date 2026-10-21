// Phone numbers are kept as "+<calling code> <digits>", e.g. "+91 9820011223". The calling codes and how
// many digits each country's numbers have come from the CTW database (/api/geo/countries, filled from
// libphonenumber-js). `countries` below are those rows: { code, name, phone_code, phone_lengths, phone_main }.

export const digitsOf = (s) => String(s ?? '').replace(/\D/g, '');

export function countryNamed(countries, name) {
  const n = (name || '').trim().toLowerCase();
  return n ? countries?.find((c) => c.name.toLowerCase() === n) : undefined;
}

// "10", "9 or 10", "8, 9 or 10"
export function lengthText(lengths) {
  if (!lengths?.length) return '';
  return lengths.length === 1 ? String(lengths[0]) : `${lengths.slice(0, -1).join(', ')} or ${lengths.at(-1)}`;
}

// -> { country, digits, hasCode }. A number without "+" has no code yet: `preferred` (the office's country)
// is offered for it. A code several countries share (+1, +44) means `preferred` when it has that code,
// else the country the code mainly stands for.
export function parsePhone(value, countries, preferred) {
  const v = String(value ?? '').trim();
  const all = digitsOf(v);
  if (!v.startsWith('+')) return { country: preferred || null, digits: all, hasCode: false };
  // Calling codes are 1–3 digits and none is the start of another.
  for (let n = 1; n <= 3; n++) {
    const code = all.slice(0, n);
    const same = (countries || []).filter((c) => c.phone_code === code);
    if (same.length) {
      const country = same.find((c) => c.code === preferred?.code) || same.find((c) => c.phone_main) || same[0];
      return { country, digits: all.slice(n), hasCode: true };
    }
  }
  return { country: null, digits: all, hasCode: false };
}

export const formatPhone = (country, digits) => (digits ? (country ? `+${country.phone_code} ${digits}` : digits) : '');

// What is wrong with a phone number, or null. Without the country list only "required" is checked.
export function phoneProblem(value, countries, preferred, { required = false } = {}) {
  if (!String(value ?? '').trim()) return required ? 'is required' : null;
  if (!countries?.length) return null;
  const { country, digits, hasCode } = parsePhone(value, countries, preferred);
  if (!hasCode || !country) return 'choose the country code';
  const lengths = country.phone_lengths;
  if (lengths?.length && !lengths.includes(digits.length)) {
    return `must be ${lengthText(lengths)} digits for ${country.name} (+${country.phone_code})`;
  }
  return null;
}
