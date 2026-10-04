import { MotiView } from 'moti';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Tap } from '@/components/ui/tap';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Todo } from '@/lib/api/todos';
import { dueLabel } from '@/lib/todos';

type Props = { todo: Todo; onToggle: () => void; onDelete?: () => void; showDue?: boolean };

/** Tap anywhere to tick it off; done tasks fade and strike through. */
export function TodoRow({ todo, onToggle, onDelete, showDue = true }: Props) {
  const theme = useTheme();
  const done = !!todo.done_at;
  const due = showDue && !done ? dueLabel(todo.due) : null;
  const late = due?.startsWith('Overdue');
  return (
    <View style={styles.row}>
      <Tap
        onPress={onToggle}
        scaleTo={0.985}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={todo.title}
        containerStyle={styles.fill}
        style={styles.main}>
        <MotiView
          animate={{ scale: done ? 1 : 0.94, backgroundColor: done ? theme.accent : 'transparent' }}
          transition={Motion.pop}
          style={[styles.check, { borderColor: done ? theme.accent : theme.textTertiary }]}>
          {done && <Icon name="check" color={theme.onAccent} size={14} weight="bold" />}
        </MotiView>
        <View style={styles.text}>
          <ThemedText type="body" color={done ? theme.textTertiary : theme.text} numberOfLines={2} style={done && styles.struck}>
            {todo.title}
          </ThemedText>
          {due && (
            <ThemedText type="small" color={late ? theme.danger : theme.textTertiary}>
              {due}
            </ThemedText>
          )}
        </View>
      </Tap>
      {onDelete && <IconButton icon="trash" label={`Delete ${todo.title}`} variant="bare" color={theme.textTertiary} size={16} onPress={onDelete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.one },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: Spacing.three, paddingRight: Spacing.two, paddingVertical: 12, minHeight: 52 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 1 },
  struck: { textDecorationLine: 'line-through' },
});
