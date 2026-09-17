'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_AVATAR } from './avatars';

const KEY = 'thali_avatar';

// Shared across every consumer — the Profile picker and the nav tab both read
// it, so picking a face has to update both without a remount.
let current: string | null = null;            // null → not read from storage yet
const listeners = new Set<() => void>();

function read(): string {
  if (current === null) {
    try {
      current = window.localStorage.getItem(KEY) ?? DEFAULT_AVATAR;
    } catch {
      current = DEFAULT_AVATAR;               // storage blocked
    }
  }
  return current;
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

/**
 * Chosen avatar, kept on the device alongside the theme preference. It is a
 * look, not profile data, so it deliberately stays out of the profile payload
 * the backend validates.
 */
export function useAvatar() {
  const avatarId = useSyncExternalStore(subscribe, read, () => DEFAULT_AVATAR);

  const setAvatar = useCallback((id: string) => {
    current = id;
    try { window.localStorage.setItem(KEY, id); } catch { /* ignore */ }
    listeners.forEach(fn => fn());
  }, []);

  return { avatarId, setAvatar };
}
