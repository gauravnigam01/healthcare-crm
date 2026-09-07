import { createContext, useContext, useEffect, useRef } from "react";

export const CallingPanelActionsContext = createContext({
  actions: null,
  setActions: () => {},
});

export function useCallingPanelActions() {
  return useContext(CallingPanelActionsContext);
}

// Called by whichever tab currently owns SAVE / Save & Next (e.g. the order
// form). The Calling Panel itself has no idea what's active — it just invokes
// whatever the active tab registered here.
//
// onSave/onSaveAndNext are stashed in a ref (updated every render, no effect
// needed) so the Calling Panel always calls the latest closure without the
// registration effect re-running on every render — only re-registers when
// saveLabel actually changes value.
export function useRegisterCallingPanelActions({ onSave, onSaveAndNext, saveLabel }) {
  const { setActions } = useCallingPanelActions();
  const handlersRef = useRef({});
  handlersRef.current.onSave = onSave;
  handlersRef.current.onSaveAndNext = onSaveAndNext;

  useEffect(() => {
    setActions({
      onSave: (...args) => handlersRef.current.onSave?.(...args),
      onSaveAndNext: (...args) => handlersRef.current.onSaveAndNext?.(...args),
      saveLabel,
    });
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveLabel]);
}
