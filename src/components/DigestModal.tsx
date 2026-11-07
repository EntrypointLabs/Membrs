import { useState, type FormEvent } from 'react';
import { africanCities, subscribe } from '../lib/api';
import { emailError, isValidEmail } from '../lib/email';
import {
  cityStore,
  interestsStore,
  subscriptionStore,
} from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { closeOverlay, toast } from '../lib/ui';
import { CityChips, InterestPicker } from './InterestPicker';
import { Icon } from './Icon';
import { Link } from './Link';
import { Modal } from './Modal';

/**
 * The full digest setup: email, a city anywhere in Africa, and interests.
 * Opened from the settings button by the footer signup and from the plans
 * and subscribe prompts across the app.
 */
export function DigestModal() {
  const savedCity = useStore(cityStore);
  const joined = useStore(subscriptionStore);
  const [email, setEmail] = useState(joined?.email ?? '');
  const [city, setCity] = useState(joined?.city ?? savedCity);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return setError(emailError(email));
    if (!consent)
      return setError('Tick the box to agree to the digest emails.');
    await subscribe({
      email: email.trim(),
      city,
      interests: interestsStore.get(),
    });
    cityStore.set(city);
    subscriptionStore.set({ email: email.trim(), city });
    closeOverlay();
    toast(`Subscribed for ${city}. Your first digest lands Sunday at 7 AM.`);
  }

  function useMyLocation() {
    // Precise location never leaves the device. Without a reverse-geocoder in
    // the lite rollout, this keeps the detected city and says so.
    toast(`Using ${savedCity}, detected from your connection.`);
    setCity(savedCity);
  }

  return (
    <Modal title="The Sunday Digest" onClose={closeOverlay} wide>
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-10 md:grid-cols-2"
      >
        <div className="flex flex-col gap-6">
          <p className="text-fg-3">
            One short email every Sunday morning, built around what you pick.
            Unsubscribe any time.
          </p>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@email.com"
              autoComplete="email"
              className="bg-soft border-line-2 focus:border-fg h-12 w-full rounded-md border px-4 outline-none"
            />
          </label>
          <div>
            <span className="mb-2 block text-sm font-bold">
              City{' '}
              <span className="text-fg-3 font-medium">Anywhere in Africa</span>
            </span>
            <div className="bg-soft border-line-2 mb-3 flex h-12 items-center gap-2 rounded-md border pr-1.5 pl-4">
              <Icon name="pin" className="text-fg-3" />
              <input
                list="african-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search a city"
                aria-label="City"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={useMyLocation}
                className="bg-btn hover:bg-btn-hover flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold"
              >
                <Icon name="nav" className="h-3.5 w-3.5" /> Use my location
              </button>
              <datalist id="african-cities">
                {africanCities().map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <CityChips value={city} onChange={setCity} />
          </div>
        </div>
        <InterestPicker />
        <div className="border-line flex flex-col gap-4 border-t pt-6 md:col-span-2 md:flex-row md:items-center md:justify-between">
          <label className="text-fg-3 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 accent-[#2b55ff]"
            />
            <span>
              I agree to the digest, promotional emails and the{' '}
              <Link
                href={paths.legal('privacy')}
                onClick={closeOverlay}
                className="text-fg underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {error && (
            <p role="alert" className="text-urgent text-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="bg-brand hover:bg-brand-hover h-12 shrink-0 rounded-md px-6 font-bold text-white"
          >
            Subscribe for {city || 'your city'} ↗
          </button>
        </div>
      </form>
    </Modal>
  );
}
