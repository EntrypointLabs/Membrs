import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  area,
  context,
  itemRef,
  track,
  trackItemOpened,
} from '../lib/analytics';
import { listingById, taxonomy } from '../lib/api';
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
  suggestions,
  type AssistantMessage,
  type AssistantStep,
  type Draft,
} from '../lib/assistant';
import { sessionStore } from '../lib/auth';
import { API_BASE } from '../lib/config';
import { useDialog } from '../lib/focus';
import { blocks, type Inline } from '../lib/markdown';
import { isPhone } from '../lib/media';
import { BACKDROP_MOTION, SHEET_MOTION } from '../lib/motion';
import { cityStore, interestsStore } from '../lib/preferences';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import type { Listing } from '../lib/types';
import { closeOverlay, openOverlay, overlayStore } from '../lib/ui';
import { cn } from '../lib/utils';
import { openSignIn } from './AuthModal';
import { Icon } from './Icon';
import { Link } from './Link';
import { listingFace } from './ListingCard';
import { MediaCard } from './MediaCard';
import { GLASS } from './MobileTabBar';
import { Bubble, BubbleContent } from './ui/bubble';
import { Button } from './ui/button';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './ui/empty';
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

export function AskLauncher() {
  const overlay = useStore(overlayStore);
  if (overlay === 'assistant') return null;
  return (
    <button
      type="button"
      aria-label={TITLE}
      aria-haspopup="dialog"
      onClick={() => openOverlay('assistant')}
      {...context({ action: 'open_assistant' })}
      className={cn(
        GLASS,
        'text-accent fixed right-3 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-40 hidden h-14 w-14 place-items-center rounded-full transition-[translate,scale] duration-150 ease-out active:scale-95 md:grid',
        'md:bg-brand md:hover:bg-brand-hover md:right-6 md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))] md:border-0 md:text-white md:shadow-[0_12px_32px_rgb(0_0_0/0.35)] md:backdrop-blur-none md:hover:-translate-y-0.5',
      )}
    >
      <Icon name="spark" className="h-6 w-6" />
    </button>
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
    .map((id) => listingById(id))
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
  const listing = step.listingId ? listingById(step.listingId) : undefined;
  const name = step.title ?? listing?.title;
  if (!name) return null;
  return (
    <>
      {' '}
      {listing ? (
        <Link
          href={paths.listing(listing.id)}
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

function EmptyState({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  const interests = useStore(interestsStore);
  const city = useStore(cityStore);
  const chips = suggestions(interests, city, taxonomy().onboardingInterests);
  return (
    <Empty className="min-h-0 gap-5 overflow-y-auto px-4 py-8 md:p-8">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-brand rounded-lg text-white">
          <Icon name="spark" className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-fg text-lg font-semibold">
          {titleCase('What are you looking for?')}
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent className="max-w-none gap-5">
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={disabled}
              onClick={() => onPick(chip)}
              {...context({ action: 'suggestion' })}
              className="border-line-2 text-fg-2 hover:bg-soft-hover hover:text-fg rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
        <p className="text-fg-4 text-[13px]">
          Chats are deleted when you start a new one.
        </p>
      </EmptyContent>
    </Empty>
  );
}

function Conversation({ onPick }: { onPick: (text: string) => void }) {
  const state = useStore(assistantStore);
  const reduced = useReducedMotion();
  const messages = state.conversation?.messages ?? [];
  const [seen] = useState(() => new Set(messages.map((m) => m.id)));

  if (!messages.length && !state.streaming)
    return <EmptyState disabled={!canSend(state)} onPick={onPick} />;
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

function Composer() {
  const state = useStore(assistantStore);
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const streaming = Boolean(state.streaming);
  const allowed = canSend(state);
  const busy = streaming || state.starting;
  const left = MAX_MESSAGE_LENGTH - text.length;

  useEffect(() => {
    if (!isPhone()) field.current?.focus();
  }, []);

  async function send(value = text) {
    if (!value.trim() || busy || !allowed) return;
    setText('');
    if (!(await askTracked(value, 'composer')))
      setText((current) => current || value);
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

  const counts = [
    state.conversation ? messagesLeftLine(state.messagesLeft) : '',
    chatsLeftLine(state.conversationsLeftToday),
  ].filter(Boolean);

  return (
    <form onSubmit={onSubmit} className="shrink-0 px-3 pt-1 pb-3">
      {state.error && (
        <p
          role="alert"
          className="text-urgent mb-2 px-1 text-[13px] font-medium"
        >
          {state.error}
        </p>
      )}
      <InputGroup
        data-disabled={!allowed}
        className="bg-bg dark:bg-bg has-[[data-slot=input-group-control]:focus-visible]:border-accent rounded-xl has-[[data-slot=input-group-control]:focus-visible]:ring-0"
      >
        <InputGroupTextarea
          ref={field}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!allowed}
          aria-label="Message"
          placeholder={allowed ? 'Ask about events and opportunities' : ''}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          className="max-h-[calc(5lh+12px)] min-h-0 overflow-y-auto px-3.5 pt-3 pb-1 text-[15px] leading-6 focus-visible:outline-none! md:text-[15px]"
        />
        <InputGroupAddon align="block-end" className="justify-end px-2 pb-2">
          {streaming ? (
            <InputGroupButton
              size="icon-sm"
              variant="secondary"
              aria-label="Stop"
              onClick={stopTracked}
              className="rounded-full"
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
              className="bg-brand hover:bg-brand-hover rounded-full text-white"
            >
              <Icon name="arrowUp" className="size-4" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <div className="text-fg-4 mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-xs">
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

function Body() {
  const session = useStore(sessionStore);
  const state = useStore(assistantStore);
  const signedIn = Boolean(session?.accessToken);

  useEffect(() => {
    if (signedIn) void loadAssistant();
  }, [signedIn]);

  if (!API_BASE || state.status === 'unavailable')
    return (
      <Centered>
        <h3 className="text-lg font-semibold">{titleCase('Unavailable')}</h3>
        <p className="text-fg-3 text-[15px]">{ASSISTANT_UNAVAILABLE}</p>
      </Centered>
    );
  if (!signedIn)
    return (
      <Centered>
        <Button
          type="button"
          onClick={() => openSignIn('in')}
          {...context({ action: 'sign_in' })}
          className="bg-brand hover:bg-brand-hover h-11 px-6 text-[15px] font-semibold text-white"
        >
          Sign in
        </Button>
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
  return (
    <>
      <Conversation onPick={(text) => void askTracked(text, 'suggestion')} />
      <Composer />
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
    <div className="fixed inset-0 z-[60] flex items-end pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pointer-events-none md:inset-auto md:right-6 md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))] md:pb-0">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={closeOverlay}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden ${BACKDROP_MOTION}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-title"
        tabIndex={-1}
        {...area('assistant')}
        className={cn(
          'bg-panel border-line-2 text-fg relative mx-3 flex h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-88px)] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-2xl outline-none md:mx-0 md:flex-none',
          'md:pointer-events-auto md:origin-bottom-right md:rounded-lg md:shadow-[0_24px_64px_rgb(0_0_0/0.35)] md:transition-[width,height] md:duration-300 md:ease-out',
          expanded
            ? 'md:h-[calc(100dvh-48px)] md:w-[min(820px,calc(100vw-48px))]'
            : 'md:h-[min(780px,calc(100dvh-48px))] md:w-[min(520px,calc(100vw-48px))]',
          SHEET_MOTION,
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-1 pr-2 pl-4">
          <h2
            id="ask-title"
            className="flex-1 truncate text-[17px] font-semibold tracking-tight"
          >
            {TITLE}
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
                      void newChat();
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
            className="text-fg-2"
          >
            <Icon name="x" className="h-5 w-5" />
          </Button>
        </header>
        <Body />
      </div>
    </div>
  );
}
