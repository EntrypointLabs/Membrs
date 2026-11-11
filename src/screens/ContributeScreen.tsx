import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
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
import { Chip } from '../components/InterestPicker';
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
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const KINDS: { value: ContributeKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'place', label: 'Place' },
  { value: 'promo', label: 'Promo' },
  { value: 'ad', label: 'Advertise' },
];

const CAPTION = 'text-fg-4 text-[13px]';

const LABEL = 'text-fg w-full text-[15px] font-medium';

const CONTROL = 'placeholder:text-fg-4 h-12 px-4 text-base md:text-base';

const SEND = 'mt-auto h-12 self-start px-6 text-base';

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

  const details = form.fields.filter((f) => f.type !== 'select');
  const choices = form.fields.filter((f) => f.type === 'select');
  const spans = fullWidth(details);
  const sections = isAd
    ? ['Details', 'Placement', 'Photo', 'Run length', 'Content']
    : ['Details', 'Category', 'Photo'];
  const step = (name: string) =>
    String(sections.indexOf(name) + 1).padStart(2, '0');

  return (
    <div className="page grid gap-12 pt-10 pb-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:pt-16 lg:gap-24">
      <aside className="md:top-bar flex flex-col md:sticky md:self-start">
        <p className="text-fg-3 text-sm font-semibold">Contribute</p>
        <h1 className="mt-3 text-[40px] leading-[1.02] font-semibold tracking-[-0.03em] md:text-[56px]">
          {titleCase(form.title)}
        </h1>
        <p className="text-fg-2 mt-5 max-w-[42ch] text-[17px] leading-relaxed">
          {form.lead}
        </p>
        <div className="mt-8">
          <Tabs
            label="What are you sending?"
            value={kind}
            options={KINDS}
            onChange={(k) => navigate(paths.contribute(k), { replace: true })}
          />
        </div>
        {isAd ? (
          <AdPreview
            placement={placement}
            title={values.title}
            brand={values.name}
            city={values.city}
            photo={photo}
          />
        ) : (
          <NextSteps />
        )}
        <p className="text-fg-3 mt-10 text-[15px]">
          Rather talk it through?{' '}
          <a
            href={`mailto:${CONTACT.hello}`}
            className="text-fg inline-flex items-center gap-1 underline underline-offset-4"
          >
            Email us
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </a>
        </p>
      </aside>

      <form
        onSubmit={onSubmit}
        onFocus={isAd ? preloadCheckout : undefined}
        noValidate
        className="flex flex-col gap-14"
      >
        <Section index={step('Details')} title="Details">
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
            {details.map((f, i) => (
              <TextField
                key={f.name}
                field={f}
                wide={spans[i] ?? true}
                value={filled[f.name] ?? ''}
                error={errors[f.name]}
                onChange={(v) => set(f.name, v)}
              />
            ))}
          </div>
        </Section>

        <Section
          index={step(isAd ? 'Placement' : 'Category')}
          title={isAd ? 'Placement' : 'Category'}
        >
          {choices.map((f) => (
            <ChoiceField
              key={f.name}
              field={f}
              value={filled[f.name] ?? ''}
              error={errors[f.name]}
              onChange={(v) => set(f.name, v)}
            />
          ))}
        </Section>

        <Section index={step('Photo')} title="Photo" optional={!isAd}>
          <PhotoField
            ad={isAd}
            photo={photo}
            error={errors.photo}
            onChange={(url) => {
              setPhoto(url);
              setErrors((prev) => ({ ...prev, photo: '' }));
            }}
          />
        </Section>

        {isAd && (
          <>
            <Section index={step('Run length')} title="Run length">
              <RunLength placement={placement} days={days} onChange={setDays} />
            </Section>
            <Section index={step('Content')} title="Content">
              <ContentPolicy
                agreed={agreed}
                error={errors.agreed}
                onChange={(v) => {
                  setAgreed(v);
                  setErrors((prev) => ({ ...prev, agreed: '' }));
                }}
              />
            </Section>
          </>
        )}

        {isAd ? (
          <SendCard title="Ready to go live?">
            <Total quote={adQuote} />
          </SendCard>
        ) : (
          <SendCard title="Ready to send?">
            <p className="text-inv-fg-3 max-w-[46ch] text-[15px] leading-relaxed">
              Check the details once more. Submissions follow our{' '}
              <Link
                href={paths.legal('guidelines')}
                className="text-inv-fg underline underline-offset-2"
              >
                Listing Guidelines
              </Link>
              .
            </p>
            <Button type="submit" size="lg" className={SEND}>
              Submit for review
              <Icon name="arrow" className="size-4" />
            </Button>
          </SendCard>
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

const STEPS = [
  ['Send it in', 'Fill in the form. It takes about two minutes.'],
  ['We check it', 'A person reviews it, usually within 2 working days.'],
  ['It goes live', 'We email you the moment it is on membrs.'],
] as const;

function NextSteps() {
  return (
    <section className="border-line-2 mt-12 border-t pt-6">
      <h2 className="text-fg text-[15px] font-semibold">What happens next</h2>
      <ol className="mt-5 grid gap-5">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[28px_1fr] gap-x-3">
            <span className="text-fg-4 text-[15px] tabular-nums">{i + 1}</span>
            <span>
              <span className="text-fg block text-[15px] font-medium">
                {title}
              </span>
              <span className="text-fg-3 mt-0.5 block text-[15px]">{body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Section({
  index,
  title,
  optional = false,
  children,
}: {
  index: string;
  title: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-line-2 flex flex-col gap-7 border-t pt-6">
      <header className="flex items-baseline gap-4">
        <span className="text-fg-4 text-[15px] font-medium tabular-nums">
          {index}
        </span>
        <h2 className="text-fg text-[24px] leading-tight font-semibold tracking-tight">
          {title}
        </h2>
        {optional && (
          <span className="text-fg-4 ml-auto text-sm">Optional</span>
        )}
      </header>
      {children}
    </section>
  );
}

function FieldName({
  htmlFor,
  id,
  optional,
  children,
}: {
  htmlFor?: string;
  id?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <FieldLabel htmlFor={htmlFor} id={id} className={LABEL}>
      {children}
      {optional && (
        <span className="text-fg-4 ml-auto font-normal">Optional</span>
      )}
    </FieldLabel>
  );
}

function isWide(field: FormField) {
  return (
    field.name === 'name' ||
    field.name === 'title' ||
    field.type === 'url' ||
    field.type === 'textarea'
  );
}

function fullWidth(fields: FormField[]): boolean[] {
  let paired = false;
  return fields.map((f, i) => {
    if (isWide(f)) return true;
    if (paired) {
      paired = false;
      return false;
    }
    const next = fields[i + 1];
    paired = Boolean(next && !isWide(next));
    return !paired;
  });
}

function TextField({
  field,
  wide,
  value,
  error,
  onChange,
}: {
  field: FormField;
  wide: boolean;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `f-${field.name}`;
  const invalid = Boolean(error);
  return (
    <Field
      data-invalid={invalid}
      className={cn('gap-2', wide && 'md:col-span-2')}
    >
      <FieldName htmlFor={id} optional={!field.required}>
        {field.label}
      </FieldName>
      {field.type === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          className="placeholder:text-fg-4 min-h-28 px-4 text-base md:text-base"
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

function ChoiceField({
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
    <Field data-invalid={invalid} className="gap-3">
      <FieldName id={id}>{field.label}</FieldName>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {field.options?.map((o) => (
          <Chip
            key={o}
            on={value === o}
            mark={false}
            invalid={invalid}
            onClick={() => onChange(o)}
          >
            {o}
          </Chip>
        ))}
      </div>
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
    <Field data-invalid={invalid} className="gap-2">
      <label
        htmlFor="f-photo"
        className={`bg-soft hover:bg-soft-hover flex min-h-44 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-6 text-center transition-colors ${invalid ? 'border-destructive' : 'border-line-2'}`}
      >
        {photo ? (
          <img src={photo} alt="Your upload" className="max-h-56 rounded-md" />
        ) : (
          <>
            <Icon name="image" className="text-fg-3 h-6 w-6" />
            <span className="text-[15px] font-semibold">
              {ad ? 'Choose your listing photo' : 'Choose a file'}
            </span>
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
        aria-label={ad ? 'Listing photo' : 'Photo'}
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

function SendCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-inv text-inv-fg flex min-h-60 flex-col gap-3 rounded-md p-6 md:p-8">
      <h2 className="text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">
        {titleCase(title)}
      </h2>
      {children}
    </div>
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
  ).slice(0, 1);
  return (
    <section className="border-line-2 mt-12 border-t pt-6">
      <p className={cn(CAPTION, 'mb-5')}>
        Preview: your ad is the first listing
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6">
        <div className="flex flex-col">
          <div className="bg-btn ring-primary grid aspect-[4/3] place-items-center overflow-hidden rounded-md ring-2 ring-offset-4 ring-offset-[var(--soft)]">
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name="image" className="text-fg-4 h-8 w-8" />
            )}
          </div>
          <p className="text-fg-3 mt-3 text-[13px]">{brand || 'Your brand'}</p>
          <h3 className="mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:text-lg md:leading-tight">
            {title || 'Your headline'}
          </h3>
          <p className="text-fg-3 mt-auto pt-2 text-[13px]">
            {city || 'Your city'}
          </p>
        </div>
        {after.map((l) => (
          <div
            key={l.id}
            aria-hidden="true"
            className="pointer-events-none opacity-40"
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
  // Any run from 1 to 90 days. The presets cover most buyers; Custom covers the rest.
  const preset = DURATIONS.some((d) => d.days === days);
  const [custom, setCustom] = useState(!preset);
  const [draft, setDraft] = useState(String(days));
  const choose = (v: string) => {
    if (v === 'custom') {
      setCustom(true);
      onChange(Math.max(1, Math.min(90, Number(draft) || 10)));
      return;
    }
    setCustom(false);
    onChange(Number(v));
  };
  return (
    <FieldSet>
      <FieldLegend variant="label" className={cn(LABEL, 'mb-1')}>
        How long should it run?
      </FieldLegend>
      <FieldDescription className="text-fg-3">
        Longer runs cost less per day: 10% off from 14 days, 20% off from 30.
      </FieldDescription>
      <RadioGroup
        value={custom ? 'custom' : String(days)}
        onValueChange={choose}
        className="grid grid-cols-2 gap-2.5 md:grid-cols-5"
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
        <FieldLabel
          htmlFor="run-custom"
          className="border-input has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/[0.06] col-span-2 rounded-md md:col-span-1"
        >
          <Field orientation="horizontal" className="p-3.5">
            <FieldContent className="gap-1">
              <FieldTitle className="text-fg text-[15px]">Custom</FieldTitle>
              {custom ? (
                <span className="text-fg-3 flex items-center gap-2 text-sm">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={90}
                    value={draft}
                    aria-label="Number of days"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      const n = Number(e.target.value);
                      if (n >= 1) onChange(Math.min(90, Math.round(n)));
                    }}
                    className="h-8 w-16 px-2 text-sm md:text-sm"
                  />
                  days
                </span>
              ) : (
                <FieldDescription className="text-fg-3 text-sm">
                  Pick the days
                </FieldDescription>
              )}
            </FieldContent>
            <RadioGroupItem value="custom" id="run-custom" />
          </Field>
        </FieldLabel>
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
      <FieldLegend variant="label" className={cn(LABEL, 'mb-1')}>
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
    <>
      <dl className="text-inv-fg-2 mt-2 grid max-w-[420px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[15px]">
        <dt>
          {placementLabel(quote.placement)}, {quote.days}{' '}
          {quote.days === 1 ? 'day' : 'days'}
        </dt>
        <dd className="tabular-nums">{naira(quote.subtotal)}</dd>
        {quote.discount > 0 && (
          <>
            <dt>Longer run</dt>
            <dd className="tabular-nums">−{naira(quote.discount)}</dd>
          </>
        )}
        <dt className="text-inv-fg mt-2 font-semibold">Due now</dt>
        <dd className="text-inv-fg mt-2 text-xl font-semibold tabular-nums">
          {naira(quote.total)}
        </dd>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-8">
        <Button type="submit" size="lg" className={cn(SEND, 'mt-0')}>
          Pay {naira(quote.total)}
          <Icon name="arrow" className="size-4" />
        </Button>
        <p className="text-inv-fg-3 text-sm">Payments are handled by Bachs.</p>
      </div>
    </>
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
    [
      'Placement',
      `${placementLabel(quote.placement)}, ${quote.days} {quote.days === 1 ? 'day' : 'days'}`,
    ],
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
