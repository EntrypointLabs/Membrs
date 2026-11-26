import { createStore } from './store';

const FIELDS = 'input, textarea, select, [contenteditable="true"]';

export const typingStore = createStore<boolean>(null, false);

function followFocus(): void {
  const typing = document.activeElement?.matches(FIELDS) ?? false;
  document.documentElement.toggleAttribute('data-typing', typing);
  typingStore.set(typing);
}

function followVisibleArea(): void {
  const visible = window.visualViewport;
  if (!visible) return;
  const root = document.documentElement.style;
  root.setProperty('--visible-top', `${visible.offsetTop}px`);
  root.setProperty('--visible-height', `${visible.height}px`);
}

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', followFocus);
  document.addEventListener('focusout', followFocus);
  window.visualViewport?.addEventListener('resize', followVisibleArea);
  window.visualViewport?.addEventListener('scroll', followVisibleArea);
  followVisibleArea();
}
