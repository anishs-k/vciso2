import { useEffect, useState } from 'react';
import { api } from '../api';

// Countries, states and cities for an office, from the CTW database (/api/geo). Each list is fetched once
// per page load. Offices store the names; the codes are only used to ask for the next list.
const cache = new Map();
function load(path) {
  if (!cache.has(path)) cache.set(path, api(path).catch((err) => (cache.delete(path), Promise.reject(err))));
  return cache.get(path);
}

const byName = (list, name) => {
  const n = (name || '').trim().toLowerCase();
  return n ? list?.find((x) => x.name.toLowerCase() === n) : undefined;
};

// The list at `path` (null while loading or without a path; [] when the request fails).
function useList(path) {
  const [list, setList] = useState(null);
  useEffect(() => {
    setList(null);
    if (!path) return undefined;
    let live = true;
    load(path)
      .then((r) => live && setList(r))
      .catch(() => live && setList([]));
    return () => {
      live = false;
    };
  }, [path]);
  return list;
}

// All countries with their phone codes: [{ code, name, phone_code, phone_lengths, phone_main }], null while loading.
export const useCountries = () => useList('/geo/countries');

// -> { countries, states, cities } as lists of names; null while loading. A list is [] when the choice above
// is not in its own list (a name typed before the lists existed, e.g. "Greater London"): nothing to offer,
// so the form lets it be typed.
export function usePlaces(countryName, stateName) {
  const countryList = useList('/geo/countries');
  const country = byName(countryList, countryName);
  const c = country && encodeURIComponent(country.code);
  const stateList = useList(c && `/geo/countries/${c}/states`);
  const state = byName(stateList, stateName);
  const s = state && encodeURIComponent(state.code);
  const cityList = useList(c && s && `/geo/countries/${c}/states/${s}/cities`);
  const states = country ? stateList && stateList.map((x) => x.name) : countryList && [];
  return {
    countries: countryList && countryList.map((x) => x.name),
    states,
    cities: state ? cityList : states && [],
  };
}
