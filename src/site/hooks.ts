import { useCallback, useEffect, useRef, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function placeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('place');
}

function urlWithPlace(id: string | null): string {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('place', id);
  else url.searchParams.delete('place');
  return url.pathname + url.search + url.hash;
}

export function placeLink(id: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('place', id);
  return url.href;
}

/**
 * The open place lives in the URL (?place=franklin), so a place can be shared
 * and the phone's back button closes the details.
 */
export function usePlaceInUrl(isValid: (id: string) => boolean) {
  const valid = useCallback((id: string | null) => (id && isValid(id) ? id : null), [isValid]);
  const [openId, setOpenId] = useState(() => valid(placeFromUrl()));

  useEffect(() => {
    const onPop = () => setOpenId(valid(placeFromUrl()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [valid]);

  const open = useCallback((id: string) => {
    if (placeFromUrl() === id) return setOpenId(id);
    const replace = placeFromUrl() !== null;
    const state = { place: id, pushed: !replace || window.history.state?.pushed === true };
    if (replace) window.history.replaceState(state, '', urlWithPlace(id));
    else window.history.pushState(state, '', urlWithPlace(id));
    setOpenId(id);
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    if (window.history.state?.pushed) window.history.back();
    else window.history.replaceState(null, '', urlWithPlace(null));
  }, []);

  return { openId, open, close };
}

export function useToast(duration = 2400) {
  const [message, setMessage] = useState('');
  const timer = useRef<number>(undefined);
  const show = useCallback((text: string) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), duration);
  }, [duration]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { message, show };
}

/** Stop the page behind an overlay from scrolling. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = previous; };
  }, [locked]);
}

/** Share with the phone's share sheet, or copy the link. */
export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
