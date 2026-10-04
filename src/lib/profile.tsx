import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';

import { getProfile, type Profile, type ProfileInput, saveProfile } from '@/lib/api/profile';
import { errorMessage } from '@/lib/errors';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  save: (input: ProfileInput) => Promise<Profile>;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setProfile(await getProfile());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once when the signed-in area mounts
    refresh();
  }, [refresh]);

  const save = useCallback(async (input: ProfileInput) => {
    const next = await saveProfile(input);
    setProfile(next);
    return next;
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, isLoading, error, save, refresh }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
