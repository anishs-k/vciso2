import { useEffect, useState } from 'react';
import { api } from '../api';

// Frameworks, modules and choice lists: loaded once per page load.
let cached = null;

export function useCatalogue() {
  const [catalogue, setCatalogue] = useState(cached);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (cached) return;
    Promise.all([api('/frameworks'), api('/modules'), api('/options')])
      .then(([frameworks, modules, options]) => {
        cached = { frameworks, modules, options };
        setCatalogue(cached);
      })
      .catch(setError);
  }, []);
  return { catalogue, error };
}
