import { AnimatePresence, MotiView } from 'moti';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Tap } from '@/components/ui/tap';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

type Toast = { id: number; message: string; action?: { label: string; onPress: () => void } };
type Show = (message: string, action?: Toast['action']) => void;

const ToastContext = createContext<Show>(() => {});

/** `toast('Deleted', { label: 'Undo', onPress })` — one line, five seconds, above the tab bar. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: PropsWithChildren) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { railed } = useLayout();
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const show = useCallback<Show>((message, action) => setToast({ id: ++nextId.current, message, action }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + (railed ? Spacing.four : 104) }]}>
        <AnimatePresence>
          {toast && (
            <MotiView
              key={toast.id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 8 }}
              exitTransition={{ type: 'timing', duration: 150 }}
              transition={Motion.settle}
              accessibilityLiveRegion="polite"
              role="status"
              style={[styles.toast, { backgroundColor: theme.text }]}>
              <ThemedText type="smallStrong" color={theme.inverse} style={styles.message} numberOfLines={2}>
                {toast.message}
              </ThemedText>
              {toast.action && (
                <Tap
                  onPress={() => {
                    toast.action?.onPress();
                    setToast(null);
                  }}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  style={styles.action}>
                  <ThemedText type="smallStrong" color={theme.inverse} style={styles.actionText}>
                    {toast.action.label}
                  </ThemedText>
                </Tap>
              )}
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 480,
    width: '100%',
    paddingLeft: Spacing.three + 4,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
    borderRadius: Radius.large,
    boxShadow: '0 8px 24px rgba(12,14,20,0.18)',
  },
  message: { flex: 1 },
  action: { paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.medium },
  actionText: { textDecorationLine: 'underline' },
});
