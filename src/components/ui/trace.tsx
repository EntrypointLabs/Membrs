import * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Trace({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="trace"
      className={cn(
        'before:bg-line-2 relative flex min-w-0 flex-col before:absolute before:top-3.5 before:bottom-3.5 before:left-[7.5px] before:w-px',
        className,
      )}
      {...props}
    />
  );
}

function TraceLine({
  className,
  status,
  ...props
}: React.ComponentProps<'div'> & { status?: 'running' | 'error' }) {
  return (
    <div
      data-slot="trace-line"
      data-status={status}
      className={cn(
        'group/trace-line relative grid min-w-0 grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 py-1 text-[13px] leading-5',
        className,
      )}
      {...props}
    />
  );
}

function TraceIcon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="trace-icon"
      aria-hidden="true"
      className={cn(
        'bg-panel text-fg-4 group-data-[status=error]/trace-line:text-urgent group-data-[status=running]/trace-line:text-fg-2 relative col-start-1 row-start-1 flex h-5 w-4 items-center justify-center [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  );
}

function TraceTitle({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="trace-title"
      className={cn(
        'text-fg-3 group-hover/trace-trigger:text-fg group-data-[status=error]/trace-line:text-urgent group-data-[status=running]/trace-line:text-fg-2 col-start-2 row-start-1 min-w-0 break-words',
        className,
      )}
      {...props}
    />
  );
}

function TraceCollapsible(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Root>,
) {
  return <CollapsiblePrimitive.Root data-slot="trace-collapsible" {...props} />;
}

function TraceCollapsibleTrigger({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="trace-collapsible-trigger"
      className={cn(
        'group/trace-trigger text-fg-3 hover:text-fg col-start-2 row-start-1 flex min-w-0 items-center gap-1 justify-self-start rounded-sm text-left transition-colors [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180 motion-reduce:[&>svg]:transition-none',
        className,
      )}
      {...props}
    />
  );
}

function TraceCollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="trace-collapsible-content"
      className={cn(
        'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down col-start-2 min-w-0 overflow-hidden motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
};
