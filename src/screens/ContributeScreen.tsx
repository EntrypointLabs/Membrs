import { useState, type FormEvent } from 'react';
import { contributeForm, submitContribution } from '../lib/api';
import { CONTACT } from '../lib/config';
import { navigate, paths } from '../lib/router';
import { titleCase } from '../lib/text';
import type { ContributeKind, FormField } from '../lib/types';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';
import { Tabs } from '../components/Tabs';

const KINDS: { value: ContributeKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'place', label: 'Place' },
  { value: 'promo', label: 'Promo' },
  { value: 'ad', label: 'Advertise' },
];

/**
 * One page for everything people send in: listings, places, promos and ad
 * requests. Each kind is a tab; Advertise also shows the ad at true size
 * above the form so the buyer sees exactly what runs.
 */
export function ContributeScreen({ kind }: { kind: ContributeKind }) {
  const form = contributeForm(kind);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = Object.fromEntries(
      form.fields
        .filter((f) => f.required && !values[f.name]?.trim())
        .map((f) => [f.name, `Add the ${f.label.toLowerCase()}.`]),
    );
    setErrors(missing);
    if (Object.keys(missing).length) return;
    await submitContribution(kind, values);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="page grid min-h-[50vh] place-items-center text-center">
        <div className="max-w-md">
          <Icon name="check" className="text-open mx-auto h-10 w-10" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Thanks, it&apos;s in review
          </h1>
          <p className="text-fg-3 mt-3">
            A person checks every submission, usually within 2 working days.
            We&apos;ll email you when it goes live.
          </p>
          <Link
            href="/"
            className="bg-fg text-bg mt-6 inline-flex h-11 items-center rounded-md px-5 font-bold"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page pt-8 md:pt-16">
      <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
        Contribute
      </h1>
      <div className="mt-8">
        <Tabs
          label="What are you sending?"
          value={kind}
          options={KINDS}
          onChange={(k) => navigate(paths.contribute(k), { replace: true })}
        />
      </div>
      {kind === 'ad' && <AdPreview name={values.name} />}
      <form onSubmit={onSubmit} noValidate className="mt-12">
        <h2 className="text-3xl font-semibold tracking-tight">
          {titleCase(form.title)}
        </h2>
        <p className="text-fg-3 mt-2 max-w-xl">{form.lead}</p>
        <div className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {form.fields.map((f) => (
            <Field
              key={f.name}
              field={f}
              value={values[f.name] ?? ''}
              error={errors[f.name]}
              onChange={(v) => {
                setValues((prev) => ({ ...prev, [f.name]: v }));
                setErrors((prev) => ({ ...prev, [f.name]: '' }));
              }}
            />
          ))}
          {kind !== 'ad' && (
            <label className="border-line-2 hover:border-fg-4 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center md:col-span-2">
              {photo ? (
                <img
                  src={photo}
                  alt="Your upload"
                  className="max-h-56 rounded-md"
                />
              ) : (
                <>
                  <Icon name="image" className="text-fg-3 h-7 w-7" />
                  <span className="font-semibold">Add a photo</span>
                  <span className="text-fg-3 text-sm">
                    JPG or PNG, landscape works best
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhoto(URL.createObjectURL(file));
                }}
              />
            </label>
          )}
        </div>
        <div className="border-line mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p className="text-fg-3 text-sm">
            Submissions follow our{' '}
            <Link
              href={paths.legal('guidelines')}
              className="text-fg underline"
            >
              Listing Guidelines
            </Link>
            . Questions: {CONTACT.hello}
          </p>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-hover h-12 rounded-md px-7 font-bold text-white"
          >
            {kind === 'ad' ? 'Request placement' : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const box = `bg-soft h-14 w-full rounded-md border px-4 outline-none focus:border-fg ${error ? 'border-urgent' : 'border-line-2'}`;
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-sm font-bold">
        {field.label}
        {!field.required && (
          <span className="text-fg-3 font-medium">Optional</span>
        )}
      </span>
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={box}
        >
          <option value="">Choose…</option>
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={box}
        />
      )}
      {error && (
        <span className="text-urgent mt-1.5 block text-sm">{error}</span>
      )}
    </label>
  );
}

/** The ad at the size it runs: a featured card in a feed, 4:3 photo. */
function AdPreview({ name }: { name?: string }) {
  return (
    <section className="bg-soft mt-10 rounded-lg p-6 md:p-10">
      <p className="text-fg-3 mb-5 text-sm font-semibold">Preview, true size</p>
      <div className="w-full max-w-[420px]">
        <div className="bg-btn grid aspect-[4/3] place-items-center rounded-md">
          <Icon name="image" className="text-fg-4 h-8 w-8" />
        </div>
        <p className="text-fg-3 mt-5 text-[15px]">Featured · Lagos</p>
        <h3 className="mt-2 text-[23px] font-semibold tracking-tight">
          {name || 'Your brand'}
        </h3>
      </div>
    </section>
  );
}
