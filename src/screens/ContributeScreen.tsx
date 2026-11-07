import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  DURATIONS,
  discountRate,
  isPlacement,
  naira,
  quote as quoteFor,
  DAY_RATE,
  type AdQuote,
  type Placement,
} from '../lib/ads';
import { contributeForm, submitContribution } from '../lib/api';
import { CONTACT } from '../lib/config';
import { isValidEmail } from '../lib/email';
import {
  PAYMENTS_DEMO,
  demoReference,
  payForAd,
  preloadCheckout,
} from '../lib/payments';
import { toast } from '../lib/ui';
import { BachsDemo } from '../components/BachsDemo';
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
  const isAd = kind === 'ad';
  const [days, setDays] = useState(7);
  const [agreed, setAgreed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [paid, setPaid] = useState<{
    quote: AdQuote;
    reference: string;
  } | null>(null);

  // The receipt is a new page in all but URL, so it starts at the top.
  useEffect(() => {
    if (paid) window.scrollTo(0, 0);
  }, [paid]);

  // The placement select starts on its first option, so the quote does too.
  const firstPlacement = form.fields.find((f) => f.name === 'cat')
    ?.options?.[0] as Placement | undefined;
  const chosen = values.cat ?? '';
  const placement: Placement = isPlacement(chosen)
    ? chosen
    : (firstPlacement ?? 'Featured listing in a category');
  const adQuote = quoteFor(placement, days);
  // What gets validated and sent: the form as shown, placement included.
  const filled = isAd ? { ...values, cat: placement } : values;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing: Record<string, string> = Object.fromEntries(
      form.fields
        .filter((f) => f.required && !filled[f.name]?.trim())
        .map((f) => [f.name, `Add the ${f.label.toLowerCase()}.`]),
    );
    if (isAd) {
      if (values.email?.trim() && !isValidEmail(values.email))
        missing.email = 'Add an email we can send the receipt to.';
      if (!photo) missing.photo = 'Add the banner image.';
      if (!agreed) missing.agreed = 'Confirm the ad is safe for work.';
    }
    setErrors(missing);
    const count = Object.keys(missing).length;
    if (count) {
      toast(
        count === 1 && missing.agreed
          ? 'Confirm the ad is safe for work to continue.'
          : 'A few details are missing.',
      );
      return;
    }
    if (!isAd) {
      await submitContribution(kind, filled);
      setSent(true);
      return;
    }
    if (PAYMENTS_DEMO) {
      setDemo(true);
      return;
    }
    try {
      const result = await payForAd({ quote: adQuote, values: filled });
      if (result.status === 'completed')
        setPaid({ quote: adQuote, reference: result.reference });
      else if (result.status === 'closed')
        toast('Payment cancelled. Nothing was charged.');
      else toast('That payment did not go through. Try again.');
    } catch {
      toast('Could not reach the payment service. Try again in a moment.');
    }
  }

  const onDemoPaid = useCallback(() => {
    setDemo(false);
    setPaid({ quote: adQuote, reference: demoReference() });
  }, [adQuote]);

  if (paid) {
    return (
      <AdPaid
        quote={paid.quote}
        reference={paid.reference}
        email={values.email ?? ''}
        start={values.date}
        onAgain={() => {
          setPaid(null);
          setValues({});
          setPhoto(null);
          setAgreed(false);
          setDays(7);
        }}
      />
    );
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
      {kind === 'ad' && <AdPreview name={values.name} photo={photo} />}
      <form
        onSubmit={onSubmit}
        onFocus={isAd ? preloadCheckout : undefined}
        noValidate
        className="mt-12"
      >
        <h2 className="text-3xl font-semibold tracking-tight">
          {titleCase(form.title)}
        </h2>
        <p className="text-fg-3 mt-2 max-w-xl">{form.lead}</p>
        <div className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {form.fields.map((f) => (
            <Field
              key={f.name}
              field={f}
              value={filled[f.name] ?? ''}
              error={errors[f.name]}
              onChange={(v) => {
                setValues((prev) => ({ ...prev, [f.name]: v }));
                setErrors((prev) => ({ ...prev, [f.name]: '' }));
              }}
            />
          ))}
          <label
            className={`hover:border-fg-4 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center md:col-span-2 ${errors.photo ? 'border-urgent' : 'border-line-2'}`}
          >
            {photo ? (
              <img
                src={photo}
                alt="Your upload"
                className="max-h-56 rounded-md"
              />
            ) : (
              <>
                <Icon name="image" className="text-fg-3 h-7 w-7" />
                <span className="font-semibold">
                  {isAd ? 'Add the banner image' : 'Add a photo'}
                </span>
                <span className="text-fg-3 text-sm">
                  {isAd
                    ? 'JPG or PNG, 4:3, at least 1200px wide'
                    : 'JPG or PNG, landscape works best'}
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
                setErrors((prev) => ({ ...prev, photo: '' }));
              }}
            />
          </label>
          {isAd && (
            <>
              <Durations placement={placement} days={days} onChange={setDays} />
              <SafeForWork
                agreed={agreed}
                error={Boolean(errors.agreed)}
                onChange={(v) => {
                  setAgreed(v);
                  setErrors((prev) => ({ ...prev, agreed: '' }));
                }}
              />
              <Summary quote={adQuote} />
            </>
          )}
        </div>
        <div className="border-line mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p className="text-fg-3 text-sm">
            {isAd && (
              <>
                Secure payment by Bachs. Full refund if not approved.
                <br />
              </>
            )}
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
            className="bg-brand hover:bg-brand-hover inline-flex h-12 items-center gap-2 rounded-md px-7 font-bold text-white"
          >
            {isAd ? (
              <>
                Pay {naira(adQuote.total)} with
                <b className="text-brand rounded-[6px] bg-white px-[7px] py-0.5 text-sm font-black tracking-tight">
                  Bachs
                </b>
              </>
            ) : (
              'Submit for review'
            )}
          </button>
        </div>
      </form>
      {demo && (
        <BachsDemo
          quote={adQuote}
          email={values.email ?? ''}
          onPaid={onDemoPaid}
          onClose={() => {
            setDemo(false);
            toast('Payment cancelled. Your ad is still here.');
          }}
        />
      )}
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
function AdPreview({ name, photo }: { name?: string; photo: string | null }) {
  return (
    <section className="bg-soft mt-10 rounded-lg p-6 md:p-10">
      <p className="text-fg-3 mb-5 text-sm font-semibold">Preview, true size</p>
      <div className="w-full max-w-[420px]">
        <div className="bg-btn grid aspect-[4/3] place-items-center overflow-hidden rounded-md">
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="image" className="text-fg-4 h-8 w-8" />
          )}
        </div>
        <p className="text-fg-3 mt-5 text-[15px]">Featured · Lagos</p>
        <h3 className="mt-2 text-[23px] font-semibold tracking-tight">
          {name || 'Your brand'}
        </h3>
      </div>
    </section>
  );
}

/** Run length, with each option's price so the buyer compares totals, not rates. */
function Durations({
  placement,
  days,
  onChange,
}: {
  placement: Placement;
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <fieldset className="md:col-span-2">
      <legend className="mb-2 text-sm font-bold">
        How long should it run?
      </legend>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {DURATIONS.map((d) => {
          const off = discountRate(d.days);
          const on = d.days === days;
          return (
            <button
              key={d.days}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(d.days)}
              className={`relative flex flex-col items-start gap-1 rounded-md border-[1.5px] px-4 py-3.5 text-left ${on ? 'border-brand bg-brand/10' : 'border-line-2 bg-soft'}`}
            >
              <b className="text-[15px]">{d.label}</b>
              <span className="text-fg-3 text-sm">
                {naira(quoteFor(placement, d.days).total)}
              </span>
              {off > 0 && (
                <em className="text-open absolute top-2.5 right-2.5 text-[11.5px] font-bold not-italic">
                  {off * 100}% off
                </em>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-fg-3 mt-2 text-sm">
        {naira(DAY_RATE[placement])} a day for this placement.
      </p>
    </fieldset>
  );
}

/**
 * The content rule, said before anyone pays. Every ad is checked against the
 * Advertising Policy after payment and refused ads are refunded, so the
 * buyer confirms the rule up front rather than finding out later.
 */
function SafeForWork({
  agreed,
  error,
  onChange,
}: {
  agreed: boolean;
  error: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <section className="border-warning/35 bg-warning/[0.07] rounded-md border px-5 py-5 md:col-span-2 md:px-6">
      <h3 className="flex items-center gap-2 text-base font-bold">
        <Icon name="lock" className="text-warning h-[18px] w-[18px]" />
        Safe for work only
      </h3>
      <p className="text-fg-2 mt-2 text-[14.5px]">
        Every ad is checked against our{' '}
        <Link
          href={paths.legal('advertising')}
          className="text-brand dark:text-accent font-semibold"
        >
          Advertising Policy
        </Link>{' '}
        and{' '}
        <Link
          href={paths.legal('guidelines')}
          className="text-brand dark:text-accent font-semibold"
        >
          Listing Guidelines
        </Link>{' '}
        before it goes live. We do not run:
      </p>
      <ul className="text-fg-2 mt-2.5 mb-4 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm md:grid-cols-2">
        <li>Adult, sexual or NSFW content of any kind</li>
        <li>Gambling, betting and loan apps</li>
        <li>Weapons, drugs, tobacco and vapes</li>
        <li>Scams, get-rich-quick or pyramid schemes</li>
        <li>Hate, violence or misleading claims</li>
      </ul>
      <label
        className={`bg-soft flex cursor-pointer items-start gap-2.5 rounded-[10px] px-3.5 py-3 text-[14.5px] ${error ? 'ring-urgent ring-[1.5px]' : ''}`}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error}
          className="accent-brand mt-[3px] h-[17px] w-[17px] shrink-0"
        />
        <span>
          I confirm this ad is safe for work and follows the Advertising Policy.
          If it is not approved, I get a full refund.
        </span>
      </label>
    </section>
  );
}

function Summary({ quote }: { quote: AdQuote }) {
  return (
    <section className="bg-soft rounded-md px-5 py-4 md:col-span-2 md:px-6">
      <div className="text-fg-2 flex justify-between gap-4 py-1.5 text-[15px]">
        <span>{quote.placement}</span>
        <span>
          {naira(quote.rate)} × {quote.days} days
        </span>
      </div>
      {quote.discount > 0 && (
        <div className="text-fg-2 flex justify-between gap-4 py-1.5 text-[15px]">
          <span>Longer run discount</span>
          <span className="text-open">−{naira(quote.discount)}</span>
        </div>
      )}
      <div className="border-line-2 mt-1.5 flex items-baseline justify-between gap-4 border-t pt-3">
        <span>Total, paid now</span>
        <b className="text-[22px] tracking-tight">{naira(quote.total)}</b>
      </div>
      <p className="text-fg-3 mt-2.5 flex gap-2 text-[13.5px]">
        <Icon name="check" className="text-open mt-0.5 h-4 w-4 shrink-0" />
        Pay now, then our reviewer checks it against the guidelines, usually
        within minutes. Approved ads go live on your start date. Rejected ads
        are refunded in full.
      </p>
    </section>
  );
}

/** After payment: what was paid, where review is, and when it goes live. */
function AdPaid({
  quote,
  reference,
  email,
  start,
  onAgain,
}: {
  quote: AdQuote;
  reference: string;
  email: string;
  start?: string;
  onAgain: () => void;
}) {
  const live = start
    ? `From ${new Date(`${start}T12:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })}`
    : 'On your start date';
  const steps = [
    { title: 'Paid', body: `Ref ${reference}`, tone: 'border-open' },
    {
      title: 'Review',
      body: 'Checked against the guidelines, usually within minutes',
      tone: 'border-brand',
    },
    { title: 'Live', body: live, tone: 'border-transparent' },
  ];
  return (
    <div className="page grid min-h-[60vh] place-items-center py-16 text-center">
      <div className="max-w-2xl">
        <Icon name="check" className="text-open mx-auto h-10 w-10" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Paid. Your Ad Is in Review.
        </h1>
        <p className="text-fg-3 mt-3">
          {naira(quote.total)} received for {quote.placement.toLowerCase()},{' '}
          {quote.days} days. Receipt and updates go to {email}.
        </p>
        <ol className="my-8 grid gap-2.5 text-left md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.title}
              className={`bg-soft grid gap-1 rounded-md border-[1.5px] p-3.5 ${s.tone}`}
            >
              <b className="text-[15px]">{s.title}</b>
              <span className="text-fg-3 text-[13px]">{s.body}</span>
            </li>
          ))}
        </ol>
        <p className="text-fg-3 text-sm">
          If it is not approved, you get a full refund to the same payment
          method.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <button
            type="button"
            onClick={onAgain}
            className="bg-btn hover:bg-btn-hover h-11 rounded-md px-5 font-bold"
          >
            Create another ad
          </button>
          <Link
            href="/"
            className="bg-btn hover:bg-btn-hover inline-flex h-11 items-center rounded-md px-5 font-bold"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
