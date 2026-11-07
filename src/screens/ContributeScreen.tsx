import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  DURATIONS,
  isPlacement,
  naira,
  placementLabel,
  quote as quoteFor,
  type AdQuote,
  type Placement,
} from '../lib/ads';
import { contributeForm, feed, submitContribution } from '../lib/api';
import { CONTACT } from '../lib/config';
import { isValidEmail } from '../lib/email';
import {
  PAYMENTS_DEMO,
  demoReference,
  payForAd,
  preloadCheckout,
} from '../lib/payments';
import { navigate, paths } from '../lib/router';
import { titleCase } from '../lib/text';
import type { ContributeKind, FormField } from '../lib/types';
import { toast } from '../lib/ui';
import { BachsDemo } from '../components/BachsDemo';
import { Icon } from '../components/Icon';
import { ListingCard } from '../components/ListingCard';
import { Link } from '../components/Link';
import { Tabs } from '../components/Tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const KINDS: { value: ContributeKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'place', label: 'Place' },
  { value: 'promo', label: 'Promo' },
  { value: 'ad', label: 'Advertise' },
];

/** Our controls run a little larger than shadcn's defaults, to match the type. */
const CONTROL = 'h-11 px-3.5 text-base md:text-base';

type Errors = Record<string, string>;

/**
 * One page for everything people send in: listings, places, promos and ads.
 * Every form is built from the shadcn Field components. Ads add a run
 * length, the content rule and a total, and are paid before review.
 */
export function ContributeScreen({ kind }: { kind: ContributeKind }) {
  const form = contributeForm(kind);
  const isAd = kind === 'ad';
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [days, setDays] = useState(7);
  const [agreed, setAgreed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [paid, setPaid] = useState<{
    quote: AdQuote;
    reference: string;
  } | null>(null);

  // The confirmation replaces the form, so it starts at the top.
  useEffect(() => {
    if (paid || sent) window.scrollTo(0, 0);
  }, [paid, sent]);

  // The placement starts on its first option, so the quote does too.
  const firstPlacement = form.fields.find((f) => f.name === 'cat')
    ?.options?.[0] as Placement | undefined;
  const chosen = values.cat ?? '';
  const placement: Placement = isPlacement(chosen)
    ? chosen
    : (firstPlacement ?? 'Home');
  const adQuote = quoteFor(placement, days);
  // What gets validated and sent: the form as shown, placement included.
  const filled = isAd ? { ...values, cat: placement } : values;

  const set = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing: Errors = Object.fromEntries(
      form.fields
        .filter((f) => f.required && !filled[f.name]?.trim())
        .map((f) => [f.name, 'Fill this in to continue.']),
    );
    if (filled.email?.trim() && !isValidEmail(filled.email))
      missing.email = 'That email does not look right.';
    if (isAd && !photo) missing.photo = 'Add the photo for your listing.';
    if (isAd && !agreed)
      missing.agreed = 'Confirm the ad follows the policy to continue.';
    setErrors(missing);
    if (Object.keys(missing).length) {
      document
        .querySelector('[data-invalid="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
      <div className="page grid min-h-[50vh] place-items-center py-16 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            Thanks, It&apos;s in Review
          </h1>
          <p className="text-fg-3 mt-3">
            A person checks every submission, usually within 2 working days.
            We&apos;ll email you when it goes live.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link href="/">Back to home</Link>
          </Button>
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
      {isAd && (
        <AdPreview
          placement={placement}
          title={values.title}
          brand={values.name}
          city={values.city}
          photo={photo}
        />
      )}

      <form
        onSubmit={onSubmit}
        onFocus={isAd ? preloadCheckout : undefined}
        noValidate
        className="mt-12 max-w-[920px]"
      >
        <FieldSet className="gap-8">
          <div>
            <FieldLegend className="text-3xl font-semibold tracking-tight data-[variant=legend]:text-3xl">
              {titleCase(form.title)}
            </FieldLegend>
            <FieldDescription className="text-fg-3 max-w-xl text-base">
              {form.lead}
            </FieldDescription>
          </div>

          <FieldGroup className="grid gap-x-6 gap-y-6 md:grid-cols-2">
            {form.fields.map((f) => (
              <FormControl
                key={f.name}
                field={f}
                value={filled[f.name] ?? ''}
                error={errors[f.name]}
                onChange={(v) => set(f.name, v)}
              />
            ))}
            <PhotoField
              ad={isAd}
              photo={photo}
              error={errors.photo}
              onChange={(url) => {
                setPhoto(url);
                setErrors((prev) => ({ ...prev, photo: '' }));
              }}
            />
          </FieldGroup>

          {isAd && (
            <>
              <RunLength placement={placement} days={days} onChange={setDays} />
              <ContentPolicy
                agreed={agreed}
                error={errors.agreed}
                onChange={(v) => {
                  setAgreed(v);
                  setErrors((prev) => ({ ...prev, agreed: '' }));
                }}
              />
            </>
          )}
        </FieldSet>

        <Separator className="my-10" />

        {isAd ? (
          <Total quote={adQuote} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-fg-3 text-sm">
              Submissions follow our{' '}
              <Link
                href={paths.legal('guidelines')}
                className="text-fg underline underline-offset-2"
              >
                Listing Guidelines
              </Link>
              . Questions: {CONTACT.hello}
            </p>
            <Button type="submit" size="lg" className="h-12 px-7 text-base">
              Submit for review
            </Button>
          </div>
        )}
      </form>

      {demo && (
        <BachsDemo
          quote={adQuote}
          onPaid={onDemoPaid}
          onClose={() => setDemo(false)}
        />
      )}
    </div>
  );
}

/** One fixture field as a shadcn control, with its label and error. */
function FormControl({
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
  const id = `f-${field.name}`;
  const invalid = Boolean(error);
  return (
    <Field
      data-invalid={invalid}
      className={field.type === 'textarea' ? 'md:col-span-2' : undefined}
    >
      <FieldLabel htmlFor={id} className="text-fg text-sm font-semibold">
        {field.label}
        {!field.required && (
          <span className="text-fg-4 ml-auto font-normal">Optional</span>
        )}
      </FieldLabel>
      {field.type === 'select' ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger
            id={id}
            aria-invalid={invalid}
            className={`${CONTROL} w-full data-[size=default]:h-11`}
          >
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent position="popper" className="border-input max-h-72">
            {field.options?.map((o) => (
              <SelectItem key={o} value={o} className="py-2 text-[15px]">
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-28 px-3.5 text-base md:text-base"
        />
      ) : (
        <Input
          id={id}
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          autoComplete={field.type === 'email' ? 'email' : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={CONTROL}
        />
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function PhotoField({
  ad,
  photo,
  error,
  onChange,
}: {
  ad: boolean;
  photo: string | null;
  error?: string;
  onChange: (url: string) => void;
}) {
  const invalid = Boolean(error);
  return (
    <Field data-invalid={invalid} className="md:col-span-2">
      <FieldLabel htmlFor="f-photo" className="text-fg text-sm font-semibold">
        {ad ? 'Listing photo' : 'Photo'}
        {!ad && <span className="text-fg-4 ml-auto font-normal">Optional</span>}
      </FieldLabel>
      <label
        htmlFor="f-photo"
        className={`hover:border-fg-4 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-6 text-center transition-colors ${invalid ? 'border-destructive' : 'border-input'}`}
      >
        {photo ? (
          <img src={photo} alt="Your upload" className="max-h-56 rounded-md" />
        ) : (
          <>
            <Icon name="image" className="text-fg-3 h-6 w-6" />
            <span className="text-[15px] font-semibold">Choose a file</span>
            <span className="text-fg-3 text-sm">
              {ad
                ? 'JPG or PNG, 4:3 like every listing, at least 1200px wide'
                : 'JPG or PNG, landscape works best'}
            </span>
          </>
        )}
      </label>
      <input
        id="f-photo"
        type="file"
        accept="image/*"
        aria-invalid={invalid}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file));
        }}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

/**
 * The ad where it runs: the first card in a feed, followed by real listings,
 * so the buyer sees it sits among them and is not a banner above them.
 */
function AdPreview({
  placement,
  title,
  brand,
  city,
  photo,
}: {
  placement: Placement;
  title?: string;
  brand?: string;
  city?: string;
  photo: string | null;
}) {
  const after = feed(
    placement === 'Opportunities' ? 'opportunity' : 'event',
  ).slice(0, 2);
  return (
    <section className="bg-soft mt-10 rounded-lg p-5 md:p-10">
      <p className="text-fg-3 mb-5 text-sm font-semibold">
        Preview: your ad is the first listing
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-7">
        <div className="flex flex-col">
          <div className="bg-btn ring-primary grid aspect-[4/3] place-items-center overflow-hidden rounded-md ring-2 ring-offset-4 ring-offset-[var(--soft)]">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="image" className="text-fg-4 h-8 w-8" />
            )}
          </div>
          <p className="text-fg-3 mt-3 text-[13px] md:mt-5 md:text-[15px]">
            {brand || 'Your brand'}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
            {title || 'Your headline'}
          </h3>
          <p className="text-fg-3 mt-auto pt-2 text-[13px] md:pt-3 md:text-[15px]">
            {city || 'Your city'}
          </p>
        </div>
        {after.map((l, i) => (
          <div
            key={l.id}
            aria-hidden="true"
            className={`pointer-events-none opacity-40 ${i ? 'max-md:hidden' : ''}`}
          >
            <ListingCard listing={l} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Run length as choice cards. Each shows its own total, so nobody multiplies. */
function RunLength({
  placement,
  days,
  onChange,
}: {
  placement: Placement;
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label" className="text-fg mb-1 font-semibold">
        How long should it run?
      </FieldLegend>
      <FieldDescription className="text-fg-3">
        Longer runs cost less per day.
      </FieldDescription>
      <RadioGroup
        value={String(days)}
        onValueChange={(v) => onChange(Number(v))}
        className="grid grid-cols-2 gap-2.5 md:grid-cols-4"
      >
        {DURATIONS.map((d) => {
          const q = quoteFor(placement, d.days);
          return (
            <FieldLabel
              key={d.days}
              htmlFor={`run-${d.days}`}
              className="border-input has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/[0.06] rounded-md"
            >
              <Field orientation="horizontal" className="p-3.5">
                <FieldContent className="gap-0.5">
                  <FieldTitle className="text-fg text-[15px]">
                    {d.label}
                  </FieldTitle>
                  <FieldDescription className="text-fg-3 text-sm">
                    {naira(q.total)}
                    <span className="text-fg-4 block text-[13px]">
                      {naira(Math.round(q.total / q.days))} a day
                    </span>
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value={String(d.days)} id={`run-${d.days}`} />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
    </FieldSet>
  );
}

/**
 * The content rule, stated plainly before anyone pays. Every ad is checked
 * after payment and refused ads are refunded, so the buyer agrees to the rule
 * up front instead of finding out from a refund.
 */
function ContentPolicy({
  agreed,
  error,
  onChange,
}: {
  agreed: boolean;
  error?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label" className="text-fg mb-1 font-semibold">
        Safe for work only
      </FieldLegend>
      <FieldDescription className="text-fg-2 max-w-[640px] text-[15px] leading-relaxed">
        membrs is read at work and at home, so we don&apos;t run adult or sexual
        content, gambling or loan apps, weapons, drugs, tobacco or vapes,
        get-rich-quick schemes, or anything hateful or misleading. Each ad is
        reviewed against the{' '}
        <Link
          href={paths.legal('advertising')}
          className="text-fg underline underline-offset-2"
        >
          Advertising Policy
        </Link>{' '}
        before it runs. If we turn yours down, the payment comes back to you in
        full.
      </FieldDescription>
      <Field orientation="horizontal" data-invalid={Boolean(error)}>
        <Checkbox
          id="agreed"
          checked={agreed}
          aria-invalid={Boolean(error)}
          onCheckedChange={(v) => onChange(v === true)}
          className="size-[18px]"
        />
        <FieldLabel
          htmlFor="agreed"
          className="text-fg text-[15px] font-normal"
        >
          This ad is safe for work and follows the Advertising Policy.
        </FieldLabel>
      </Field>
      {error && <FieldError className="-mt-3">{error}</FieldError>}
    </FieldSet>
  );
}

/** The bill, then the button that pays it. */
function Total({ quote }: { quote: AdQuote }) {
  return (
    <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
      <dl className="text-fg-2 grid max-w-[460px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[15px]">
        <dt>
          {placementLabel(quote.placement)}, {quote.days} days
        </dt>
        <dd className="tabular-nums">{naira(quote.subtotal)}</dd>
        {quote.discount > 0 && (
          <>
            <dt>Longer run</dt>
            <dd className="tabular-nums">−{naira(quote.discount)}</dd>
          </>
        )}
        <dt className="text-fg mt-2 font-semibold">Due now</dt>
        <dd className="text-fg mt-2 text-xl font-semibold tabular-nums">
          {naira(quote.total)}
        </dd>
      </dl>
      <div className="grid gap-2 md:justify-items-end">
        <Button type="submit" size="lg" className="h-12 px-7 text-base">
          Pay {naira(quote.total)}
        </Button>
        <p className="text-fg-3 text-sm">Payments are handled by Bachs.</p>
      </div>
    </div>
  );
}

/** After payment: the receipt, and what happens next. */
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
  const from = start
    ? new Date(`${start}T12:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : 'your start date';
  const rows: [string, string][] = [
    ['Reference', reference],
    ['Paid', naira(quote.total)],
    ['Placement', `${placementLabel(quote.placement)}, ${quote.days} days`],
    ['Starts', from],
    ['Status', 'In review'],
  ];
  return (
    <div className="page pt-10 pb-16 md:pt-20">
      <div className="max-w-[560px]">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Payment Received
        </h1>
        <p className="text-fg-3 mt-4 text-[17px]">
          Your ad is with our reviewers now. We&apos;ll email {email} when
          it&apos;s approved, and it starts running on {from}. If it isn&apos;t
          approved, you get the full {naira(quote.total)} back.
        </p>
        <dl className="border-line-2 mt-8 grid grid-cols-[auto_1fr] gap-x-8 border-t text-[15px]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="border-line col-span-2 grid grid-cols-subgrid border-b py-3"
            >
              <dt className="text-fg-3">{k}</dt>
              <dd className="text-fg font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-wrap gap-2.5">
          <Button size="lg" variant="secondary" onClick={onAgain}>
            Create another ad
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
