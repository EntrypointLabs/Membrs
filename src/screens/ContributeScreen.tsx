import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  DURATIONS,
  MAX_RUN_DAYS,
  MIN_RUN_DAYS,
  earliestStart,
  isPlacement,
  naira,
  placementLabel,
  quote as quoteFor,
  runDays,
  type AdQuote,
  type Placement,
} from '../lib/ads';
import {
  PHOTO_TYPES,
  contributeForm,
  contributionSlot,
  feed,
  submitAdRequest,
  submitContribution,
  uploadPhoto,
} from '../lib/api';
import { SignedOutError } from '../lib/auth';
import { CONTACT } from '../lib/config';
import {
  LINK_HINT,
  isWebLink,
  localIsoDate,
  photoProblem,
  readPhotoFacts,
  withScheme,
} from '../lib/contribute';
import {
  clearDraft,
  deleteDraftPhoto,
  readDraft,
  readDraftPhoto,
  saveDraftPhoto,
  writeDraft,
  type HostedPhoto,
} from '../lib/drafts';
import { isValidEmail } from '../lib/email';
import { messageOf, newIdempotencyKey } from '../lib/http';
import { consumeSent, discardSlot, sentSlotsStore } from '../lib/outbox';
import {
  PAYMENTS_AVAILABLE,
  PAYMENTS_DEMO,
  PAYMENTS_UNAVAILABLE_MESSAGE,
  demoReference,
  payForAd,
  preloadCheckout,
} from '../lib/payments';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import type { ContributeKind, FormField } from '../lib/types';
import { toast } from '../lib/ui';
import { ReaderEmailField, useReaderEmail } from '../components/EmailStep';
import { BachsDemo } from '../components/BachsDemo';
import { CityField, WORLDWIDE } from '../components/CityField';
import { Icon } from '../components/Icon';
import { Chip } from '../components/InterestPicker';
import { ListingCard, Meta } from '../components/ListingCard';
import { MediaCard } from '../components/MediaCard';
import { Tags } from '../components/Tags';
import { Link } from '../components/Link';
import { Modal } from '../components/Modal';
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

const CAPTION = 'text-fg-4 text-[13px]';

const LABEL = 'text-fg w-full text-[15px] font-medium';

const CONTROL = 'placeholder:text-fg-4 h-12 px-4 text-base md:text-base';

const DEFAULT_DAYS = 7;

type Errors = Record<string, string>;

type Busy = 'uploading' | 'sending' | 'paying' | null;

const BUSY_LABEL: Record<Exclude<Busy, null>, string> = {
  uploading: 'Uploading photo…',
  sending: 'Sending…',
  paying: 'Opening payment…',
};

function todayIso(): string {
  return localIsoDate(new Date());
}

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function ContributeScreen({ kind }: { kind: ContributeKind }) {
  const form = contributeForm(kind);
  const isAd = kind === 'ad';
  const slot = contributionSlot(kind);
  const [saved] = useState(() => readDraft(kind));
  const [values, setValues] = useState<Record<string, string>>(
    saved?.values ?? {},
  );
  const [picked, setPicked] = useState<Record<string, string>>(
    saved?.picked ?? {},
  );
  const [errors, setErrors] = useState<Errors>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState(saved?.photoId);
  const [hosted, setHosted] = useState<HostedPhoto | undefined>(saved?.hosted);
  const [restoring, setRestoring] = useState(Boolean(saved?.photoId));
  const [sent, setSent] = useState(false);
  const [days, setDays] = useState<number | null>(
    saved ? saved.days : DEFAULT_DAYS,
  );
  const [agreed, setAgreed] = useState(saved?.agreed ?? false);
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef(false);
  const [generation, setGeneration] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(0);
  const [demoPhoto, setDemoPhoto] = useState<string | null>(null);
  const [paid, setPaid] = useState<{
    quote: AdQuote;
    reference: string;
  } | null>(null);
  const reader = useReaderEmail();
  const asksForEmail =
    !reader.known && !form.fields.some((f) => f.type === 'email');
  const deliveredElsewhere = useStore(sentSlotsStore).includes(slot);

  useEffect(() => {
    if (paid || sent) window.scrollTo(0, 0);
  }, [paid, sent]);

  useEffect(() => {
    if (!scrollRequest) return;
    document
      .querySelector('[data-invalid="true"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [scrollRequest]);

  useEffect(() => {
    if (!saved?.photoId) return;
    let current = true;
    void readDraftPhoto(kind).then((blob) => {
      if (!current) return;
      if (blob) setPhoto(URL.createObjectURL(blob));
      else {
        setPhotoId(undefined);
        setHosted(undefined);
        setErrors((prev) => ({
          ...prev,
          photo: 'Add the photo again.',
        }));
      }
      setRestoring(false);
    });
    return () => {
      current = false;
    };
  }, [saved, kind]);

  useEffect(() => {
    if (sent || paid || restoring) return;
    writeDraft(kind, {
      values,
      picked,
      days,
      agreed,
      ...(photoId ? { photoId } : {}),
      ...(hosted ? { hosted } : {}),
    });
  }, [
    kind,
    values,
    picked,
    days,
    agreed,
    photoId,
    hosted,
    sent,
    paid,
    restoring,
  ]);

  const firstPlacement = form.fields.find((f) => f.name === 'cat')
    ?.options?.[0] as Placement | undefined;
  const chosen = values.cat ?? '';
  const placement: Placement = isPlacement(chosen)
    ? chosen
    : (firstPlacement ?? 'Home');
  const adQuote = days === null ? null : quoteFor(placement, days);
  const filled = isAd ? { ...values, cat: placement } : values;

  const finish = useCallback(() => {
    clearDraft(kind);
    setSent(true);
  }, [kind]);

  useEffect(() => {
    if (!deliveredElsewhere) return;
    consumeSent(slot);
    if (!isAd) finish();
  }, [deliveredElsewhere, slot, isAd, finish]);

  const set = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const setCity = (name: string, value: string, wasPicked: boolean) => {
    set(name, value);
    setPicked((prev) => {
      const next = { ...prev };
      if (wasPicked) next[name] = value;
      else delete next[name];
      return next;
    });
  };

  function problems(): Errors {
    const missing: Errors = Object.fromEntries(
      form.fields
        .filter((f) => f.required && !filled[f.name]?.trim())
        .map((f) => [
          f.name,
          f.type === 'select'
            ? f.multiple
              ? 'Pick at least one.'
              : 'Pick one to continue.'
            : 'Fill this in to continue.',
        ]),
    );
    if (filled.email?.trim() && !isValidEmail(filled.email))
      missing.email = 'That email does not look right.';
    if (asksForEmail && !reader.ready)
      missing.readerEmail = reader.email.trim()
        ? 'That email does not look right.'
        : 'Add your email so we know who sent this.';
    const startFrom = earliestStart(new Date());
    for (const f of form.fields) {
      const value = filled[f.name]?.trim();
      if (!value) continue;
      if (f.type === 'url' && !isWebLink(withScheme(value)))
        missing[f.name] = `${LINK_HINT}.`;
      if (f.type === 'date' && isAd && f.name === 'date' && value < startFrom)
        missing[f.name] = `Pick ${shortDate(startFrom)} or later.`;
      else if (f.type === 'date' && value < todayIso())
        missing[f.name] = 'Pick a date from today on.';
      if (f.type === 'city' && value !== WORLDWIDE && picked[f.name] !== value)
        missing[f.name] = 'Pick a city from the list, or Worldwide.';
    }
    if (isAd && !photo) missing.photo = 'Add the photo for your listing.';
    if (isAd && days === null)
      missing.days = `Enter ${MIN_RUN_DAYS} to ${MAX_RUN_DAYS} days.`;
    if (isAd && !agreed)
      missing.agreed = 'Confirm the ad follows the policy to continue.';
    return missing;
  }

  function withLinks(): Record<string, string> {
    const next = { ...filled };
    for (const f of form.fields)
      if (f.type === 'url' && next[f.name])
        next[f.name] = withScheme(next[f.name] ?? '');
    return next;
  }

  function needEmail() {
    toast(
      isAd
        ? 'Your details are saved. Press Pay again to continue.'
        : 'Enter your email to send this. Your details are saved.',
    );
  }

  async function hostedPhoto(): Promise<string> {
    if (!photo || !photoId) return '';
    if (hosted?.source === photoId) return hosted.url;
    setBusy('uploading');
    const url = await uploadPhoto(photo);
    if (url) setHosted({ source: photoId, url });
    return url;
  }

  async function sendContribution(payload: Record<string, string>) {
    try {
      const url = await hostedPhoto();
      setBusy('sending');
      const delivery = await submitContribution(
        kind,
        url ? { ...payload, photo: url } : payload,
      );
      if (delivery === 'sent') return finish();
      if (delivery === 'signedOut') {
        discardSlot(slot);
        return needEmail();
      }
      toast('Saved. We will send it when we can.');
    } catch (error) {
      if (error instanceof SignedOutError) return needEmail();
      toast(messageOf(error, 'Could not send this. Try again in a moment.'));
    }
  }

  async function sendAd(payload: Record<string, string>, run: AdQuote) {
    let uploaded: string;
    try {
      uploaded = await hostedPhoto();
    } catch (error) {
      if (error instanceof SignedOutError) return needEmail();
      toast(messageOf(error, 'Could not upload the photo. Try again.'));
      return;
    }
    if (PAYMENTS_DEMO) {
      setDemoPhoto(uploaded);
      return;
    }
    setBusy('paying');
    try {
      const result = await payForAd({
        quote: run,
        values: payload,
        photo: uploaded,
      });
      if (result.status === 'completed' || result.status === 'pending') {
        if (result.status === 'pending')
          toast(
            `We are still confirming payment for ${result.reference}. We will email you.`,
          );
        await saveAd(payload, run, uploaded, result.reference);
      } else if (result.status === 'closed')
        toast('Payment cancelled. Nothing was charged.');
      else toast('That payment did not go through. Try again.');
    } catch (error) {
      if (error instanceof SignedOutError) return needEmail();
      toast(
        messageOf(
          error,
          'Could not reach the payment service. Try again in a moment.',
        ),
      );
    }
  }

  async function send() {
    if (busyRef.current) return;
    const payload = withLinks();
    if (Object.entries(payload).some(([k, v]) => v !== filled[k]))
      setValues((prev) => ({ ...prev, ...payload }));
    const missing = problems();
    setErrors(missing);
    if (Object.keys(missing).length) {
      setScrollRequest((n) => n + 1);
      return;
    }
    if (isAd && !PAYMENTS_AVAILABLE) {
      toast(PAYMENTS_UNAVAILABLE_MESSAGE);
      return;
    }
    busyRef.current = true;
    setBusy('sending');
    try {
      const address = asksForEmail ? reader.email : (payload.email ?? '');
      if (!(await reader.ensureKnown(address))) return;
      if (isAd && adQuote) await sendAd(payload, adQuote);
      else if (!isAd) await sendContribution(payload);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  async function saveAd(
    payload: Record<string, string>,
    paidQuote: AdQuote,
    uploaded: string,
    reference: string,
  ) {
    try {
      const delivery = await submitAdRequest(payload, {
        photo: uploaded,
        days: paidQuote.days,
        reference,
      });
      if (delivery !== 'sent')
        toast('Paid. Your ad details will send when the connection is back.');
    } catch (error) {
      toast(
        messageOf(
          error,
          `Paid, but we could not file the ad. Email us with ${reference}.`,
        ),
      );
    }
    clearDraft(kind);
    setPaid({ quote: paidQuote, reference });
  }

  function onDemoPaid() {
    const uploaded = demoPhoto ?? '';
    setDemoPhoto(null);
    if (adQuote) void saveAd(withLinks(), adQuote, uploaded, demoReference());
  }

  async function pickPhoto(file: File) {
    const problem = photoProblem(await readPhotoFacts(file), PHOTO_TYPES);
    if (problem) {
      setErrors((prev) => ({ ...prev, photo: problem }));
      return;
    }
    setPhoto(URL.createObjectURL(file));
    setPhotoId(newIdempotencyKey());
    setHosted(undefined);
    setRestoring(false);
    setErrors((prev) => ({ ...prev, photo: '' }));
    void saveDraftPhoto(kind, file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoId(undefined);
    setHosted(undefined);
    setRestoring(false);
    void deleteDraftPhoto(kind);
  }

  function clearForm() {
    setValues({});
    setPicked({});
    setErrors({});
    removePhoto();
    setAgreed(false);
    setDays(DEFAULT_DAYS);
    setGeneration((n) => n + 1);
    clearDraft(kind);
  }

  const closeConfirm = useCallback(() => setConfirmClear(false), []);

  const hasInput =
    Object.values(values).some((v) => v.trim() !== '') ||
    Boolean(photo) ||
    agreed;

  if (paid) {
    return (
      <AdPaid
        quote={paid.quote}
        reference={paid.reference}
        email={values.email ?? ''}
        start={values.date}
        onAgain={() => {
          setPaid(null);
          clearForm();
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
            We&apos;ll email you when it goes live.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link href={paths.home()}>Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const details = form.fields.filter((f) => f.type !== 'select');
  const choices = form.fields.filter((f) => f.type === 'select');
  const spans = fullWidth(details);
  const adsClosed = isAd && !PAYMENTS_AVAILABLE;
  const submitLabel = busy
    ? BUSY_LABEL[busy]
    : isAd
      ? adQuote
        ? `Pay ${naira(adQuote.total)}`
        : 'Pay'
      : 'Submit for review';

  return (
    <div className="page pt-6 pb-32 md:pt-14 md:pb-20">
      <div>
        <header>
          <h1 className="text-[36px] leading-[1.04] font-semibold tracking-[-0.03em] md:text-[56px]">
            {titleCase(form.title)}
          </h1>
        </header>

        <form
          onSubmit={onSubmit}
          onFocus={isAd ? preloadCheckout : undefined}
          noValidate
          aria-busy={busy !== null}
          className="border-line-2 mt-10 flex flex-col gap-7 border-t pt-8 md:mt-12 md:gap-8 md:pt-10"
        >
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
            {details.map((f, i) => (
              <TextField
                key={f.name}
                field={f}
                wide={spans[i] ?? true}
                min={
                  f.type !== 'date'
                    ? undefined
                    : isAd && f.name === 'date'
                      ? earliestStart(new Date())
                      : todayIso()
                }
                value={filled[f.name] ?? ''}
                error={errors[f.name]}
                onChange={(v, wasPicked) =>
                  f.type === 'city'
                    ? setCity(f.name, v, wasPicked)
                    : set(f.name, v)
                }
              />
            ))}
          </div>

          {choices.map((f) => (
            <ChoiceField
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
            onPick={(file) => void pickPhoto(file)}
            onRemove={removePhoto}
          />

          {isAd && (
            <>
              <RunLength
                key={generation}
                placement={placement}
                days={days}
                error={errors.days}
                onChange={(next) => {
                  setDays(next);
                  setErrors((prev) => ({ ...prev, days: '' }));
                }}
              />
              <AdPreview
                placement={placement}
                title={values.title}
                brand={values.name}
                city={values.city}
                photo={photo}
              />
              <ContentPolicy
                agreed={agreed}
                error={errors.agreed}
                onChange={(v) => {
                  setAgreed(v);
                  setErrors((prev) => ({ ...prev, agreed: '' }));
                }}
              />
              <Bill quote={adQuote} />
            </>
          )}

          {asksForEmail && (
            <Field data-invalid={Boolean(errors.readerEmail)} className="gap-2">
              <FieldName htmlFor="f-reader-email">Your email</FieldName>
              <ReaderEmailField
                id="f-reader-email"
                value={reader.email}
                onChange={(value) => {
                  reader.setEmail(value);
                  setErrors((prev) => ({ ...prev, readerEmail: '' }));
                }}
                className={CONTROL}
              />
              {errors.readerEmail && (
                <FieldError>{errors.readerEmail}</FieldError>
              )}
            </Field>
          )}

          <footer className="border-line-2 flex flex-col-reverse gap-3 border-t pt-6 md:flex-row md:items-center">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-5 text-base"
            >
              <a href={`mailto:${isAd ? CONTACT.ads : CONTACT.hello}`}>
                Email us instead
              </a>
            </Button>
            <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row">
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={busy !== null}
                onClick={() => (hasInput ? setConfirmClear(true) : clearForm())}
                className="h-12 px-5 text-base"
              >
                Clear form
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={busy !== null || adsClosed}
                className="h-12 px-6 text-base"
              >
                {submitLabel}
              </Button>
            </div>
          </footer>
          <p className="text-fg-3 -mt-3 text-sm">
            {adsClosed ? (
              PAYMENTS_UNAVAILABLE_MESSAGE
            ) : isAd ? (
              'Payments are handled by Bachs.'
            ) : (
              <>
                Submissions follow our{' '}
                <Link
                  href={paths.legal('guidelines')}
                  className="text-fg underline underline-offset-2"
                >
                  Listing Guidelines
                </Link>
                .
              </>
            )}
          </p>
        </form>
      </div>

      {demoPhoto !== null && adQuote && (
        <BachsDemo
          quote={adQuote}
          onPaid={onDemoPaid}
          onClose={() => setDemoPhoto(null)}
        />
      )}

      {confirmClear && (
        <Modal title={titleCase('Clear this form?')} onClose={closeConfirm}>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={closeConfirm}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearForm();
                closeConfirm();
              }}
            >
              Clear form
            </Button>
          </div>
        </Modal>
      )}
    </div>
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
  min,
  value,
  error,
  onChange,
}: {
  field: FormField;
  wide: boolean;
  min?: string;
  value: string;
  error?: string;
  onChange: (v: string, picked: boolean) => void;
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
      {field.type === 'city' ? (
        <CityField
          id={id}
          value={value}
          placeholder={field.placeholder}
          invalid={invalid}
          className={CONTROL}
          onChange={onChange}
        />
      ) : field.type === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value, false)}
          className="placeholder:text-fg-4 min-h-28 px-4 text-base md:text-base"
        />
      ) : (
        <Input
          id={id}
          type={field.type}
          min={min}
          value={value}
          placeholder={field.placeholder}
          aria-invalid={invalid}
          autoComplete={field.type === 'email' ? 'email' : undefined}
          onChange={(e) => onChange(e.target.value, false)}
          onBlur={
            field.type === 'url'
              ? () => {
                  const fixed = withScheme(value);
                  if (fixed !== value) onChange(fixed, false);
                }
              : undefined
          }
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
  const picked = field.multiple ? splitPicks(value) : [value];
  return (
    <Field data-invalid={invalid} className="gap-3">
      <FieldName id={id}>
        {field.label}
        {field.multiple && (
          <span className="text-fg-4 ml-auto font-normal">
            Pick all that fit
          </span>
        )}
      </FieldName>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {field.options?.map((o) => (
          <Chip
            key={o}
            on={picked.includes(o)}
            mark={Boolean(field.multiple)}
            invalid={invalid}
            onClick={() =>
              onChange(field.multiple ? toggled(picked, o).join(', ') : o)
            }
          >
            {o}
          </Chip>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function splitPicks(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toggled(picked: string[], option: string): string[] {
  return picked.includes(option)
    ? picked.filter((p) => p !== option)
    : [...picked, option];
}

function PhotoField({
  ad,
  photo,
  error,
  onPick,
  onRemove,
}: {
  ad: boolean;
  photo: string | null;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const invalid = Boolean(error);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const label = ad ? 'Listing photo' : 'Photo';
  return (
    <Field data-invalid={invalid} className="gap-2">
      <FieldName htmlFor="f-photo" optional={!ad}>
        {label}
      </FieldName>
      <label
        htmlFor="f-photo"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onPick(file);
        }}
        className={`${dragging ? 'bg-soft-hover border-accent' : ''} bg-soft hover:bg-soft-hover flex min-h-52 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-6 text-center transition-colors ${invalid ? 'border-destructive' : 'border-line-2'}`}
      >
        {photo ? (
          <img
            src={photo}
            alt="Your upload"
            className="rounded-photo max-h-56"
          />
        ) : (
          <>
            <Icon name="image" className="text-fg-3 h-7 w-7" />
            <span className="mt-1 text-[15px] font-semibold">
              Choose a file or drag and drop it here
            </span>
            <span className="text-fg-3 text-sm">
              JPG, PNG or WebP, up to 10 MB
            </span>
            <span className="bg-btn mt-3 rounded-sm px-4 py-2 text-[15px] font-medium">
              Browse files
            </span>
          </>
        )}
      </label>
      {photo && (
        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
          >
            Replace photo
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (input.current) input.current.value = '';
              onRemove();
            }}
          >
            Remove
          </Button>
        </div>
      )}
      <input
        ref={input}
        id="f-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={label}
        aria-invalid={invalid}
        className="sr-only size-px!"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick(file);
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
  ).slice(0, 1);
  return (
    <section>
      <p className={cn(LABEL, 'mb-1')}>Preview</p>
      <p className={cn(CAPTION, 'mb-4')}>Your ad is the first listing</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6">
        <div aria-hidden="true" className="pointer-events-none flex flex-col">
          <MediaCard
            href={paths.contribute('ad')}
            photo=""
            photoUrl={photo ?? undefined}
            title={title?.trim() || 'Your headline'}
            tag={placement === 'Opportunities' ? 'Opportunity' : 'Event'}
            meta={
              <>
                <Meta icon="org">{brand?.trim() || 'Your brand'}</Meta>
                <Meta icon="pin">{city?.trim() || 'Your city'}</Meta>
              </>
            }
            tags={
              <Tags
                names={['Sponsored']}
                className="text-[13px] md:text-[15px]"
              />
            }
          />
        </div>
        {after.map((l) => (
          <div
            key={l.id}
            aria-hidden="true"
            className="pointer-events-none flex flex-col opacity-50"
          >
            <ListingCard listing={l} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RunLength({
  placement,
  days,
  error,
  onChange,
}: {
  placement: Placement;
  days: number | null;
  error?: string;
  onChange: (days: number | null) => void;
}) {
  const preset = DURATIONS.some((d) => d.days === days);
  const [custom, setCustom] = useState(!preset);
  const [text, setText] = useState(days === null ? '' : String(days));
  const choose = (v: string) => {
    if (v === 'custom') {
      setCustom(true);
      onChange(runDays(text));
      return;
    }
    setCustom(false);
    onChange(Number(v));
  };
  return (
    <FieldSet data-invalid={Boolean(error)}>
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
                    min={MIN_RUN_DAYS}
                    max={MAX_RUN_DAYS}
                    step={1}
                    value={text}
                    aria-label="Number of days"
                    aria-invalid={Boolean(error)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setText(e.target.value);
                      onChange(runDays(e.target.value));
                    }}
                    onBlur={() => {
                      const clamped = runDays(text);
                      if (clamped !== null) setText(String(clamped));
                    }}
                    className="h-8 w-16 px-2 text-sm md:text-sm"
                  />
                  days
                </span>
              ) : (
                <FieldDescription className="text-fg-3 text-sm">
                  {MIN_RUN_DAYS} to {MAX_RUN_DAYS} days
                </FieldDescription>
              )}
            </FieldContent>
            <RadioGroupItem value="custom" id="run-custom" />
          </Field>
        </FieldLabel>
      </RadioGroup>
      {error && <FieldError className="-mt-3">{error}</FieldError>}
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

function Bill({ quote }: { quote: AdQuote | null }) {
  if (!quote) return null;
  return (
    <dl className="bg-soft grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-md p-4 text-[15px] md:p-5">
      <dt className="text-fg-2">
        {placementLabel(quote.placement)}, {plural(quote.days, 'day')}
      </dt>
      <dd className="text-fg-2 tabular-nums">{naira(quote.subtotal)}</dd>
      {quote.discount > 0 && (
        <>
          <dt className="text-fg-2">Longer run</dt>
          <dd className="text-fg-2 tabular-nums">−{naira(quote.discount)}</dd>
        </>
      )}
      <dt className="text-fg mt-2 font-semibold">Due now</dt>
      <dd className="text-fg mt-2 text-xl font-semibold tabular-nums">
        {naira(quote.total)}
      </dd>
    </dl>
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
  const from = start ? shortDate(start) : 'your start date';
  const rows: [string, string][] = [
    ['Reference', reference],
    ['Paid', naira(quote.total)],
    [
      'Placement',
      `${placementLabel(quote.placement)}, ${plural(quote.days, 'day')}`,
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
            <Link href={paths.home()}>Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
