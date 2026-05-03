import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { canonicalStudentLead } from "../data/canonicalStudentLead";
import { emptyUserProfile, type UserProfile } from "../types/userProfile";

const STORAGE_KEY = "v1_user_profile_leo_poc";

function defaultsFromCanonical(): UserProfile {
  const c = canonicalStudentLead;
  return {
    ...emptyUserProfile(),
    prenom: c.prenom,
    nom: c.nom,
    niveau_scolaire: c.niveau_actuel,
    ville: c.ville,
    email: c.email,
    telephone: c.tel,
    etablissement_actuel: c.ecole_actuelle,
    etablissements_favoris: Array.from(
      new Set(
        [c.ecole_actuelle, "ESSEC", "ESCP", "EDHEC"].filter((x) => String(x ?? "").trim() !== ""),
      ),
    ),
  };
}

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultsFromCanonical();
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const base = emptyUserProfile();
    return {
      ...base,
      ...parsed,
      etablissements_favoris: Array.isArray(parsed.etablissements_favoris)
        ? parsed.etablissements_favoris
        : [],
    };
  } catch {
    return defaultsFromCanonical();
  }
}

type UserProfileContextValue = {
  profile: UserProfile;
  setProfile: (next: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addFavoriteSchool: (name: string) => void;
  removeFavoriteSchool: (name: string) => void;
  resetProfile: () => void;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);

  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addFavoriteSchool = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfileState((prev) => {
      if (prev.etablissements_favoris.includes(trimmed)) return prev;
      const next = {
        ...prev,
        etablissements_favoris: [...prev.etablissements_favoris, trimmed],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFavoriteSchool = useCallback((name: string) => {
    setProfileState((prev) => {
      const next = {
        ...prev,
        etablissements_favoris: prev.etablissements_favoris.filter((e) => e !== name),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    const fresh = defaultsFromCanonical();
    setProfileState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      updateProfile,
      addFavoriteSchool,
      removeFavoriteSchool,
      resetProfile,
    }),
    [profile, setProfile, updateProfile, addFavoriteSchool, removeFavoriteSchool, resetProfile],
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfile must be used inside UserProfileProvider");
  return ctx;
}
