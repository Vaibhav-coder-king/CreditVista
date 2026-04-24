import { createContext, ReactNode, useContext, useReducer } from "react";
import type { CreditResult, FeatureSet, UserProfile } from "@/lib/types";
import { DEFAULT_FEATURES } from "@/lib/types";

interface State {
  profile: Partial<UserProfile>;
  features: FeatureSet;
  hasParsed: boolean;
  result: CreditResult | null;
}

type Action =
  | { type: "SET_PROFILE"; payload: Partial<UserProfile> }
  | { type: "SET_FEATURES"; payload: FeatureSet; parsed?: boolean }
  | { type: "PATCH_FEATURE"; key: keyof FeatureSet; value: number }
  | { type: "SET_RESULT"; payload: CreditResult | null }
  | { type: "LOAD_SAVED"; profile: Partial<UserProfile>; features: FeatureSet; result: CreditResult }
  | { type: "RESET" };

const initial: State = {
  profile: {},
  features: DEFAULT_FEATURES,
  hasParsed: false,
  result: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case "SET_FEATURES":
      return { ...state, features: action.payload, hasParsed: action.parsed ?? state.hasParsed };
    case "PATCH_FEATURE":
      return { ...state, features: { ...state.features, [action.key]: action.value } };
    case "SET_RESULT":
      return { ...state, result: action.payload };
    case "LOAD_SAVED":
      return {
        ...state,
        profile: action.profile,
        features: action.features,
        result: action.result,
        hasParsed: true,
      };
    case "RESET":
      return initial;
  }
}

interface CtxValue {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const VistaContext = createContext<CtxValue | null>(null);

export function VistaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <VistaContext.Provider value={{ state, dispatch }}>{children}</VistaContext.Provider>;
}

export function useVista() {
  const ctx = useContext(VistaContext);
  if (!ctx) throw new Error("useVista must be used inside VistaProvider");
  return ctx;
}
