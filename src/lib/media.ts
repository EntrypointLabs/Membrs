import { useEffect, useState } from 'react';

const PHONE_QUERY = '(max-width: 767.98px)';

export function isPhone(): boolean {
  return window.matchMedia(PHONE_QUERY).matches;
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}
