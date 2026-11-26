import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DropdownMenu } from 'radix-ui';
import {
  area,
  context,
  itemRef,
  track,
  trackItemOpened,
} from '../lib/analytics';
import { categories, feed, listingByKey } from '../lib/api';
import {
  ASSISTANT_UNAVAILABLE,
  ask,
  assistantStore,
  canSend,
  chatsLeftLine,
  loadAssistant,
  MAX_MESSAGE_LENGTH,
  messagesLeftLine,
  newChat,
  stepTitle,
  stop,
  type AssistantMessage,
  type AssistantStep,
  type Draft,
} from '../lib/assistant';
import { ToolLogo } from './ToolLogo';
import { sessionStore } from '../lib/auth';
import { API_BASE } from '../lib/config';
import { useDialog } from '../lib/focus';
import { blocks, type Inline } from '../lib/markdown';
import { isPhone, useIsPhone } from '../lib/media';
import { TOP_SHEET_MOTION } from '../lib/motion';
import {
  ASK_TOOLS,
  askWithStore,
  MEMBRS_LOGO,
  openOutside,
  type OutsideTool,
  pickTool,
  type QuickContext,
  type QuickQuestion,
  quickQuestions,
  switchToOutside,
  takesPromptInLink,
} from '../lib/askTools';
import { cityStore } from '../lib/preferences';
import { paths, useRoute } from '../lib/router';
import { createStore, useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import type { Listing } from '../lib/types';
import { closeOverlay, openOverlay, overlayStore } from '../lib/ui';
import { cn } from '../lib/utils';
import { EmailStep } from './EmailStep';
import { Icon } from './Icon';
import { Link } from './Link';
import { listingFace } from './ListingCard';
import { MediaCard } from './MediaCard';
import { Photo } from './Photo';
import { Bubble, BubbleContent } from './ui/bubble';
import { Button } from './ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from './ui/input-group';
import { Message, MessageContent } from './ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './ui/message-scroller';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from './ui/trace';

const TITLE = 'Ask membrs';
const NEAR_LIMIT = 200;

let askedAt = 0;
let stopRequested = false;

const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

/** Ask, then record how the answer went, by its shape rather than its words. */
async function askTracked(
  text: string,
  source: 'composer' | 'suggestion',
): Promise<boolean> {
  const before = assistantStore.get();
  const asked =
    before.conversation?.messages.filter((m) => m.role === 'user').length ?? 0;
  track('assistant_question_asked', {
    source,
    length: text.trim().length,
    message_number: asked + 1,
  });
  askedAt = Date.now();
  stopRequested = false;
  const ok = await ask(text);
  const after = assistantStore.get();
  const last = after.conversation?.messages.at(-1);
  const reply = ok && last?.role === 'assistant' ? last : null;
  track('assistant_answered', {
    outcome: stopRequested ? 'stopped' : reply ? 'answered' : 'failed',
    seconds: secondsSince(askedAt),
    listings_shown: reply?.listingIds.length ?? 0,
    steps: reply?.steps?.length ?? 0,
    messages_left: after.messagesLeft,
    error: reply
      ? null
      : (after.error ?? (after.messagesLeft === 0 ? 'message_limit' : null)),
  });
  return ok;
}

function stopTracked() {
  stopRequested = true;
  track('assistant_stopped', { seconds: secondsSince(askedAt) });
  stop();
}

const launcherHiddenStore = createStore<boolean>(null, false);

const MAC = /Mac|iPhone|iPad/.test(navigator.platform);

function useAskShortcut() {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || !(MAC ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();
      openOverlay('assistant');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * The web launcher: a small bar in the corner with the membrs logo, the name
 * and the shortcut. Closing it hides the bar until the next visit; the
 * shortcut keeps working either way.
 */
export function AskLauncher() {
  const overlay = useStore(overlayStore);
  const hidden = useStore(launcherHiddenStore);
  useAskShortcut();
  if (overlay === 'assistant' || hidden) return null;
  return (
    <div className="bg-panel border-line-2 fixed right-6 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-40 hidden items-center gap-1 rounded-md border p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.35)] md:flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts={MAC ? 'Meta+/' : 'Control+/'}
        onClick={() => openOverlay('assistant')}
        {...context({ action: 'open_assistant' })}
        className="hover:bg-soft-hover flex items-center gap-3 rounded-sm py-1 pr-2 pl-1 text-[15px] font-semibold transition-colors"
      >
        <ToolLogo src={MEMBRS_LOGO} size="large" />
        Ask membrs AI
        <kbd className="bg-soft text-fg-3 rounded-sm px-1.5 py-0.5 font-sans text-[13px] font-medium">
          {MAC ? '⌘ /' : 'Ctrl /'}
        </kbd>
      </button>
      <button
        type="button"
        aria-label="Hide Ask membrs"
        onClick={() => launcherHiddenStore.set(true)}
        {...context({ action: 'hide_launcher' })}
        className="text-fg-3 hover:bg-soft-hover hover:text-fg grid size-8 place-items-center rounded-sm transition-colors"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}

function closeOnPhone() {
  if (isPhone()) closeOverlay();
}

function InlineText({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, i) => {
    if (node.kind === 'bold')
      return (
        <b key={i} className="text-fg font-semibold">
          {node.text}
        </b>
      );
    if (node.kind === 'link')
      return (
        <Link
          key={i}
          href={node.href}
          target={node.href.startsWith('/') ? undefined : '_blank'}
          rel={node.href.startsWith('/') ? undefined : 'noopener noreferrer'}
          className="text-accent font-semibold break-words hover:underline"
        >
          {node.text}
        </Link>
      );
    return <span key={i}>{node.text}</span>;
  });
}

function AnswerText({ text }: { text: string }) {
  return (
    <div className="text-fg-2 grid gap-2.5 text-[15px] leading-relaxed break-words">
      {blocks(text).map((block, i) =>
        block.kind === 'paragraph' ? (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <InlineText nodes={line} />
              </span>
            ))}
          </p>
        ) : (
          <ul
            key={i}
            className={cn(
              'grid gap-1 pl-5',
              block.ordered ? 'list-decimal' : 'list-disc',
            )}
          >
            {block.items.map((item, j) => (
              <li key={j} className="marker:text-fg-4">
                <InlineText nodes={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function Typing() {
  return (
    <span
      role="status"
      aria-label="Typing"
      className="flex h-6 items-center gap-1"
    >
      {[0, 150, 300].map((delay) => (
        <i
          key={delay}
          className="bg-fg-4 h-1.5 w-1.5 animate-bounce rounded-full motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function ListingCards({ ids }: { ids: string[] }) {
  const found = ids
    .map((id) => listingByKey(id))
    .filter((l): l is Listing => Boolean(l));
  if (!found.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 *:w-[min(220px,62%)] *:shrink-0 *:snap-start">
      {found.map((listing) => (
        <MediaCard
          key={listing.id}
          {...listingFace(listing)}
          compact
          onClick={(e) => {
            trackItemOpened(
              e.currentTarget,
              itemRef.listing(listing),
              'assistant',
            );
            closeOnPhone();
          }}
        />
      ))}
    </div>
  );
}

const SPINNER = (
  <Icon name="loader" className="animate-spin motion-reduce:animate-none" />
);

function lineStatus(step: AssistantStep) {
  if (step.status === 'running') return 'running';
  if (step.status === 'failed') return 'error';
  return undefined;
}

function ThinkingStep({ step }: { step: AssistantStep }) {
  const running = step.status === 'running';
  const [toggled, setToggled] = useState<boolean | null>(null);
  const title = <TraceTitle>{stepTitle(step)}</TraceTitle>;
  return (
    <TraceCollapsible
      asChild
      open={Boolean(step.text) && (toggled ?? running)}
      onOpenChange={setToggled}
    >
      <TraceLine status={lineStatus(step)}>
        <TraceIcon>{running ? SPINNER : <Icon name="check" />}</TraceIcon>
        {step.text ? (
          <TraceCollapsibleTrigger>
            {title}
            <Icon name="chevronDown" />
          </TraceCollapsibleTrigger>
        ) : (
          title
        )}
        <TraceCollapsibleContent>
          <p className="text-fg-3 pt-1 pb-0.5 break-words whitespace-pre-wrap">
            {step.text}
          </p>
        </TraceCollapsibleContent>
      </TraceLine>
    </TraceCollapsible>
  );
}

function StepIcon({ step }: { step: AssistantStep }) {
  if (step.status === 'failed') return <Icon name="alert" />;
  if (step.kind === 'search') return <Icon name="search" />;
  if (step.status === 'running') return SPINNER;
  return <Icon name="arrowUpRight" />;
}

function OpenedName({ step }: { step: AssistantStep }) {
  const listing = step.listingId ? listingByKey(step.listingId) : undefined;
  const name = step.title ?? listing?.title;
  if (!name) return null;
  return (
    <>
      {' '}
      {listing ? (
        <Link
          href={paths.listing(listing.slug)}
          onClick={(e) => {
            trackItemOpened(
              e.currentTarget,
              itemRef.listing(listing),
              'assistant',
            );
            closeOnPhone();
          }}
          className="text-fg-2 font-medium hover:underline"
        >
          {name}
        </Link>
      ) : (
        name
      )}
    </>
  );
}

function Steps({ steps }: { steps: AssistantStep[] }) {
  return (
    <Trace>
      {steps.map((step) =>
        step.kind === 'thinking' ? (
          <ThinkingStep key={step.id} step={step} />
        ) : (
          <TraceLine key={step.id} status={lineStatus(step)}>
            <TraceIcon>
              <StepIcon step={step} />
            </TraceIcon>
            <TraceTitle>
              {stepTitle(step)}
              {step.kind === 'open' && <OpenedName step={step} />}
            </TraceTitle>
          </TraceLine>
        ),
      )}
    </Trace>
  );
}

function Answer({
  text,
  listingIds,
  steps,
  streaming = false,
}: Draft & { streaming?: boolean }) {
  const working = steps.some((step) => step.status === 'running');
  return (
    <Message>
      <MessageContent className="gap-3">
        {steps.length > 0 && <Steps steps={steps} />}
        {text ? (
          <AnswerText text={text} />
        ) : (
          streaming && !working && <Typing />
        )}
        <ListingCards ids={listingIds} />
      </MessageContent>
    </Message>
  );
}

const RISE = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const RisingItem = motion.create(MessageScrollerItem);

function Question({
  message,
  rise,
}: {
  message: AssistantMessage;
  rise: boolean;
}) {
  return (
    <RisingItem
      messageId={message.id}
      scrollAnchor
      variants={RISE}
      initial={rise ? 'hidden' : false}
      animate="shown"
    >
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent className="text-fg rounded-lg px-3.5 py-2.5 text-[15px] whitespace-pre-wrap">
              {message.content}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </RisingItem>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center px-6 py-10 text-center">
      <div className="grid justify-items-center gap-4">{children}</div>
    </div>
  );
}

function Spinner() {
  return (
    <i
      role="status"
      aria-label="Loading"
      className="text-fg-4 h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

function useQuickContext(): QuickContext {
  const route = useRoute();
  if (route.page === 'listing') {
    const listing = listingByKey(route.id);
    if (listing) return { on: listing.kind, title: listing.title };
  }
  if (route.page === 'category') {
    const category = categories().find((c) => c.slug === route.slug);
    if (category)
      return { on: 'category', name: category.name, kind: category.kind };
  }
  if (route.page === 'feed' || route.page === 'categories')
    return { on: 'feed', feed: route.feed };
  return { on: 'anywhere' };
}

function Starters({
  disabled = false,
  onPick,
  note,
}: {
  disabled?: boolean;
  onPick: (text: string) => void;
  note?: ReactNode;
}) {
  const city = useStore(cityStore);
  const picks = quickQuestions(useQuickContext(), city);
  const phone = useIsPhone();
  if (phone)
    return (
      <PhoneStarters
        picks={picks}
        city={city}
        disabled={disabled}
        onPick={onPick}
        note={note}
      />
    );
  return (
    <div className="grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto px-4 pb-4">
      <AskHero />
      {picks.map((pick) => (
        <button
          key={pick.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(pick.ask)}
          {...context({ action: 'suggestion' })}
          className="bg-soft text-fg-2 hover:bg-soft-hover hover:text-fg flex items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[15px] transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon
            name="compose"
            className="text-fg-3 h-[18px] w-[18px] shrink-0"
          />
          <span className="min-w-0 flex-1">{pick.label}</span>
          <Icon name="chevronRight" className="text-fg-3 h-4 w-4 shrink-0" />
        </button>
      ))}
      {note && <p className="text-fg-3 px-1 pt-2 text-[13px]">{note}</p>}
    </div>
  );
}

function dayPart(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function useStarterPhotos(picks: QuickQuestion[], city: string) {
  const kinds = picks.map((pick) => pick.kind ?? '').join(',');
  return useMemo(() => {
    const used = new Set<string>();
    return kinds.split(',').map((kind) => {
      if (kind !== 'event' && kind !== 'opportunity') return null;
      const pool = feed(kind).filter(
        (listing) => listing.photoUrl && !used.has(listing.id),
      );
      const found =
        pool.find((listing) => listing.city === city) ?? pool[0] ?? null;
      if (found) used.add(found.id);
      return found;
    });
  }, [kinds, city]);
}

const PHONE_STARTERS = 5;

function withEverydayPicks(
  picks: QuickQuestion[],
  city: string,
): QuickQuestion[] {
  const labels = new Set(picks.map((pick) => pick.label));
  const everyday = quickQuestions({ on: 'anywhere' }, city).filter(
    (pick) => !labels.has(pick.label),
  );
  return [...picks, ...everyday].slice(0, PHONE_STARTERS);
}

function PhoneStarters({
  picks,
  city,
  disabled,
  onPick,
  note,
}: {
  picks: QuickQuestion[];
  city: string;
  disabled: boolean;
  onPick: (text: string) => void;
  note?: ReactNode;
}) {
  const filled = withEverydayPicks(picks, city);
  const photos = useStarterPhotos(filled, city);
  const [part] = useState(() => dayPart(new Date().getHours()));
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-6 pb-4">
      <h3 className="text-[26px] leading-[1.2] font-semibold tracking-tight">
        What are you looking for this {part}?
      </h3>
      <ul className="mt-5 grid gap-0.5">
        {filled.map((pick, i) => {
          const photo = photos[i];
          return (
            <li key={pick.label}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(pick.ask)}
                {...context({ action: 'suggestion' })}
                className="active:bg-soft -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-2 text-left text-[15px] leading-snug transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                {photo ? (
                  <Photo
                    size="thumb"
                    id={photo.photo}
                    src={photo.photoUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-[10px]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-soft grid size-10 shrink-0 place-items-center rounded-[10px]"
                  >
                    <Icon name="compose" className="text-fg-3 size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">{pick.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {note && <p className="text-fg-3 pt-4 text-[13px]">{note}</p>}
    </div>
  );
}

/** The orb and the open question that start an empty chat. */
function AskHero() {
  const { tool } = useStore(askWithStore);
  const name = ASK_TOOLS.find((t) => t.id === tool)?.name ?? 'membrs';
  return (
    <div className="ask-hero -mx-4 mb-4 grid justify-items-center gap-6 px-6 pt-8 pb-6 text-center">
      <span aria-hidden="true" className="ask-orb size-[88px]" />
      <h3 className="text-[28px] leading-tight font-semibold tracking-tight">
        {titleCase(`Ask ${name} anything`)}
      </h3>
    </div>
  );
}

/**
 * The round button at the start of the composer. It picks which assistant
 * answers, membrs or one of the outside ones, and lists each with its logo.
 */
function ToolMenu() {
  const { tool } = useStore(askWithStore);
  const phone = useIsPhone();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="Open with"
        className={cn(
          'text-fg grid shrink-0 place-items-center transition-colors',
          phone
            ? 'bg-soft hover:bg-soft-hover size-9 rounded-full'
            : 'bg-bg hover:bg-soft-hover size-11 rounded-md shadow-[0_1px_3px_rgb(0_0_0/0.12)]',
        )}
      >
        <Icon name="menu" className={phone ? 'size-[18px]' : 'h-5 w-5'} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={10}
          className="bg-panel border-line-2 text-fg z-[70] min-w-56 rounded-md border p-1 shadow-[0_16px_48px_rgb(0_0_0/0.35)]"
        >
          <DropdownMenu.Label className="text-fg-3 px-3 pt-2 pb-1 text-[13px]">
            Open with
          </DropdownMenu.Label>
          {ASK_TOOLS.map((option) => (
            <DropdownMenu.Item
              key={option.id}
              onSelect={() => {
                track('assistant_tool_picked', { tool: option.id });
                pickTool(option.id);
              }}
              className="data-[highlighted]:bg-soft-hover flex h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[15px] outline-none"
            >
              <ToolLogo src={option.logo} />
              <span className="flex-1">{option.name}</span>
              {option.id === tool && (
                <Icon name="check" className="text-accent h-4 w-4" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Conversation() {
  const state = useStore(assistantStore);
  const reduced = useReducedMotion();
  const messages = state.conversation?.messages ?? [];
  const [seen] = useState(() => new Set(messages.map((m) => m.id)));

  return (
    <MessageScrollerProvider>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent
            aria-busy={Boolean(state.streaming)}
            data-ph-mask
            className="gap-6 px-4 pt-5 pb-4"
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <Question
                  key={m.id}
                  message={m}
                  rise={!reduced && !seen.has(m.id)}
                />
              ) : (
                <MessageScrollerItem key={m.id} messageId={m.id}>
                  <Answer
                    text={m.content}
                    listingIds={m.listingIds}
                    steps={m.steps ?? []}
                  />
                </MessageScrollerItem>
              ),
            )}
            {state.streaming && (
              <MessageScrollerItem messageId="streaming">
                <Answer {...state.streaming} streaming />
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton aria-label="Jump to latest" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

interface ComposerProps {
  onSend: (text: string) => Promise<boolean>;
  allowed: boolean;
  busy: boolean;
  streaming: boolean;
  placeholder: string;
  counts: string[];
  error?: string | null;
}

function Composer({
  onSend,
  allowed,
  busy,
  streaming,
  placeholder,
  counts,
  error,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [unsent, setUnsent] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const left = MAX_MESSAGE_LENGTH - text.length;
  const phone = useIsPhone();
  const shown = phone ? 'Ask anything' : placeholder;

  useEffect(() => {
    if (!isPhone()) field.current?.focus();
  }, []);

  async function send(value = text) {
    if (!value.trim() || busy || !allowed) return;
    setText('');
    setUnsent('');
    if (await onSend(value)) return;
    setText((current) => current || value);
    setUnsent(value);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void send();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send();
  }

  const sendOrStop = streaming ? (
    <InputGroupButton
      size="icon-sm"
      variant="secondary"
      aria-label="Stop"
      onClick={stopTracked}
      className={phone ? 'size-9 rounded-full' : 'size-11 rounded-md'}
    >
      <Icon name="stop" className="size-4" />
    </InputGroupButton>
  ) : (
    <InputGroupButton
      type="submit"
      size="icon-sm"
      variant="default"
      aria-label="Send"
      disabled={!text.trim() || busy || !allowed}
      className={cn(
        'bg-brand hover:bg-brand-hover text-white',
        phone ? 'size-9 rounded-full' : 'size-11 rounded-md',
      )}
    >
      <Icon name="arrowUp" className="size-4" />
    </InputGroupButton>
  );

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'shrink-0',
        phone ? 'border-line border-t px-3 pt-2 pb-2' : 'px-3 pt-1 pb-3',
      )}
    >
      {error && (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-3 px-1 max-md:px-4"
        >
          <p className="text-urgent text-[13px] font-medium">{error}</p>
          {unsent && allowed && !busy && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                track('assistant_retry_clicked', {});
                void send(unsent);
              }}
            >
              Retry
            </Button>
          )}
        </div>
      )}
      <div>
        <InputGroup
          data-disabled={!allowed}
          className={cn(
            'has-[[data-slot=input-group-control]:focus-visible]:border-accent has-[[data-slot=input-group-control]:focus-visible]:ring-0',
            'rounded-lg border-0 shadow-none',
            phone
              ? 'bg-transparent p-0 dark:bg-transparent'
              : 'bg-soft dark:bg-soft min-h-14 p-1.5',
          )}
        >
          <InputGroupTextarea
            ref={field}
            rows={1}
            value={text}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={!allowed}
            aria-label="Message"
            placeholder={allowed ? shown : phone ? counts[0] : ''}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            className={cn(
              'max-h-[calc(5lh+12px)] min-h-0 overflow-y-auto text-[15px] leading-6 focus-visible:outline-none! md:text-[15px]',
              phone ? 'px-2 pt-1 pb-2' : 'self-center px-3 py-1.5',
            )}
          />
          {phone ? (
            <InputGroupAddon
              align="block-end"
              className="justify-between p-0 pt-1 has-[>button]:mx-0"
            >
              <ToolMenu />
              {sendOrStop}
            </InputGroupAddon>
          ) : (
            <>
              <InputGroupAddon
                align="inline-start"
                className="self-end p-0 has-[>button]:ml-0"
              >
                <ToolMenu />
              </InputGroupAddon>
              <InputGroupAddon
                align="inline-end"
                className="self-end p-0 has-[>button]:mr-0"
              >
                {sendOrStop}
              </InputGroupAddon>
            </>
          )}
        </InputGroup>
      </div>
      <div className="text-fg-4 mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-xs max-md:hidden">
        <span className={cn(!allowed && 'text-fg-2 font-medium')}>
          {counts[0]}
        </span>
        {left <= NEAR_LIMIT ? (
          <span className={cn(left === 0 && 'text-urgent')}>
            {plural(left, 'character')} left
          </span>
        ) : (
          counts[1] && <span>{counts[1]}</span>
        )}
      </div>
    </form>
  );
}

function MembrsComposer() {
  const state = useStore(assistantStore);
  const streaming = Boolean(state.streaming);
  const counts = [
    state.conversation ? messagesLeftLine(state.messagesLeft) : '',
    chatsLeftLine(state.conversationsLeftToday),
  ].filter(Boolean);
  return (
    <Composer
      onSend={(text) => askTracked(text, 'composer')}
      allowed={canSend(state)}
      busy={streaming || state.starting}
      streaming={streaming}
      placeholder="Ask about events and opportunities"
      counts={counts}
      error={state.error}
    />
  );
}

function carriedNote(
  tool: OutsideTool,
  chat: AssistantMessage[],
  usedUp: boolean,
) {
  const name = ASK_TOOLS.find((t) => t.id === tool)?.name ?? tool;
  const lines = [];
  if (chat.length)
    lines.push(
      usedUp
        ? `No membrs messages left in this chat, so it goes to ${name} with your question.`
        : `Your membrs chat goes to ${name} with your question.`,
    );
  if (!takesPromptInLink(tool))
    lines.push(`${name} opens empty, so your question is copied to paste in.`);
  return lines.join(' ');
}

function OutsideBody({ tool }: { tool: OutsideTool }) {
  const state = useStore(assistantStore);
  const chat = state.conversation?.messages ?? [];
  const name = ASK_TOOLS.find((t) => t.id === tool)?.name ?? tool;
  const send = (question: string, source: 'composer' | 'suggestion') => {
    track('assistant_outside_opened', {
      tool,
      source,
      length: question.trim().length,
      carried_messages: chat.length,
    });
    openOutside(tool, question, chat);
    return Promise.resolve(true);
  };
  return (
    <>
      <Starters
        onPick={(text) => void send(text, 'suggestion')}
        note={carriedNote(
          tool,
          chat,
          state.status === 'ready' && !canSend(state),
        )}
      />
      <Composer
        onSend={(text) => send(text, 'composer')}
        allowed
        busy={false}
        streaming={false}
        placeholder={`Ask ${name}`}
        counts={[]}
      />
    </>
  );
}

function useSwitchWhenUsedUp() {
  const state = useStore(assistantStore);
  const { tool } = useStore(askWithStore);
  const switched = useRef(false);
  const usedUp =
    state.status === 'ready' &&
    !state.streaming &&
    !state.starting &&
    !canSend(state);
  useEffect(() => {
    if (!usedUp) {
      switched.current = false;
      return;
    }
    if (tool !== 'membrs' || switched.current) return;
    switched.current = true;
    switchToOutside();
  }, [usedUp, tool]);
}

function Body() {
  const session = useStore(sessionStore);
  const { tool } = useStore(askWithStore);
  const known = Boolean(session?.accessToken);

  useLayoutEffect(() => pickTool('membrs'), []);
  useEffect(() => {
    if (known) void loadAssistant();
  }, [known]);
  useSwitchWhenUsedUp();

  return (
    <>{tool === 'membrs' ? <MembrsBody /> : <OutsideBody tool={tool} />}</>
  );
}

function MembrsBody() {
  const session = useStore(sessionStore);
  const state = useStore(assistantStore);
  const known = Boolean(session?.accessToken);

  if (!API_BASE || state.status === 'unavailable')
    return (
      <Centered>
        <h3 className="text-lg font-semibold">{titleCase('Unavailable')}</h3>
        <p className="text-fg-3 text-[15px]">{ASSISTANT_UNAVAILABLE}</p>
      </Centered>
    );
  if (!known)
    return (
      <Centered>
        <AskHero />
        <p className="text-fg-3 max-w-xs text-[15px]">
          Enter your email to ask membrs about events, opportunities and
          deadlines.
        </p>
        <div className="w-full max-w-xs">
          <EmailStep
            actionLabel="Continue"
            onContinue={() => undefined}
            placement="assistant"
          />
        </div>
        <div className="text-fg-3 flex items-center gap-3 text-[15px]">
          <ToolMenu />
          Or ask another assistant
        </div>
      </Centered>
    );
  if (state.status === 'idle' || state.status === 'loading')
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  if (state.status === 'failed')
    return (
      <Centered>
        <p className="text-fg-3 text-[15px]">{state.error}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            track('assistant_retry_clicked', {});
            void loadAssistant();
          }}
        >
          Try again
        </Button>
      </Centered>
    );
  const empty = !state.conversation?.messages.length && !state.streaming;
  return (
    <>
      {empty ? (
        <Starters
          disabled={!canSend(state) || state.starting}
          onPick={(text) => void askTracked(text, 'suggestion')}
        />
      ) : (
        <Conversation />
      )}
      <MembrsComposer />
    </>
  );
}

const EXPANDED_KEY = 'membrs.askExpanded';

function readExpanded(): boolean {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeExpanded(expanded: boolean): void {
  try {
    window.localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0');
  } catch {
    return;
  }
}

export function AssistantPanel() {
  const panel = useRef<HTMLDivElement>(null);
  const state = useStore(assistantStore);
  const session = useStore(sessionStore);
  const ready =
    Boolean(API_BASE && session?.accessToken) && state.status === 'ready';
  const hasMessages = Boolean(state.conversation?.messages.length);
  const { tool } = useStore(askWithStore);
  const chatting =
    tool === 'membrs' && (hasMessages || Boolean(state.streaming));
  const [expanded, setExpanded] = useState(readExpanded);
  useDialog(panel, closeOverlay);

  const toggleExpanded = () => {
    track('assistant_expanded', { expanded: !expanded });
    setExpanded((was) => {
      writeExpanded(!was);
      return !was;
    });
  };

  useEffect(() => {
    if (!isPhone()) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:pointer-events-none md:inset-auto md:right-6 md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={closeOverlay}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden starting:opacity-0"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-title"
        tabIndex={-1}
        {...area('assistant')}
        className={cn(
          'bg-bg text-fg md:bg-panel md:border-line-2 relative flex min-w-0 flex-1 flex-col overflow-hidden pb-[calc(var(--tab-bar-space)+env(safe-area-inset-bottom,0px))] outline-none max-md:h-dvh max-md:pt-[env(safe-area-inset-top,0px)] md:flex-none md:border md:pb-0',
          'md:pointer-events-auto md:origin-bottom-right md:rounded-lg md:shadow-[0_24px_64px_rgb(0_0_0/0.35)] md:transition-[width,height] md:duration-300 md:ease-out',
          expanded
            ? 'md:h-[calc(100dvh-48px)] md:w-[min(820px,calc(100vw-48px))]'
            : 'md:w-[min(520px,calc(100vw-48px))]',
          !expanded &&
            (chatting
              ? 'md:h-[min(780px,calc(100dvh-48px))]'
              : 'md:max-h-[min(780px,calc(100dvh-48px))]'),
          TOP_SHEET_MOTION,
          'max-md:transition-[translate,scale,opacity,height]',
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-1 pr-2 pl-4">
          <h2 id="ask-title" className="flex-1 truncate">
            <span className="sr-only">{TITLE}</span>
            <span
              aria-hidden="true"
              className="text-[22px] leading-none font-black tracking-[-0.05em]"
            >
              MEMBRS
            </span>
          </h2>
          {ready && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="New chat"
                    disabled={
                      !hasMessages ||
                      Boolean(state.streaming) ||
                      state.starting ||
                      state.conversationsLeftToday <= 0
                    }
                    onClick={() => {
                      track('assistant_new_chat', {
                        conversations_left: state.conversationsLeftToday,
                      });
                      void newChat().then(
                        (started) => started && pickTool('membrs'),
                      );
                    }}
                    className="text-fg-2"
                  >
                    <Icon name="compose" className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[70]">
                  New chat
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Make smaller' : 'Make bigger'}
            aria-pressed={expanded}
            onClick={toggleExpanded}
            className="text-fg-2 hidden md:inline-flex"
          >
            <Icon name={expanded ? 'collapse' : 'expand'} className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={closeOverlay}
            className="text-destructive hover:text-destructive"
          >
            <Icon name="x" className="h-5 w-5" />
          </Button>
        </header>
        <Body />
      </div>
    </div>
  );
}
