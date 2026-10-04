import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TodoRow } from '@/components/todo-row';
import { Blob, BlobColors } from '@/components/ui/blob';
import { Chip } from '@/components/ui/chip';
import { Group } from '@/components/ui/group';
import { Icon } from '@/components/ui/icon';
import { Screen, Section } from '@/components/ui/screen';
import { Tap } from '@/components/ui/tap';
import { useToast } from '@/components/ui/toast';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { addTodo, deleteTodo, listTodos, restoreTodo, setTodoDone, type Todo } from '@/lib/api/todos';
import { addDays } from '@/lib/day';
import { errorMessage } from '@/lib/errors';
import { groupTodos } from '@/lib/todos';

type When = 'today' | 'tomorrow' | 'week' | 'someday';
const WHEN: { key: When; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Next week' },
  { key: 'someday', label: 'Someday' },
];
const dueFor = (w: When) => (w === 'today' ? new Date() : w === 'tomorrow' ? addDays(new Date(), 1) : w === 'week' ? addDays(new Date(), 7) : null);

export default function TodosScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { twoUp } = useLayout();
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const { data, refetch } = useAsyncData(listTodos);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<When>('today');
  const [saving, setSaving] = useState(false);
  const groups = groupTodos(data ?? []);

  async function add() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addTodo(title, dueFor(when));
      setTitle('');
      await refetch();
    } catch (err) {
      toast(errorMessage(err, 'Couldn’t add that task.'));
    } finally {
      setSaving(false);
    }
  }

  const toggle = (t: Todo) => setTodoDone(t.id, !t.done_at).then(refetch).catch((err) => toast(errorMessage(err, 'Couldn’t update that.')));
  const remove = async (t: Todo) => {
    await deleteTodo(t.id);
    refetch();
    toast(`Deleted “${t.title}”`, { label: 'Undo', onPress: () => restoreTodo(t).then(refetch) });
  };

  const section = (label: string, items: Todo[], showDue = true) =>
    items.length > 0 && (
      <Section title={label} key={label}>
        <Group>
          {items.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} onDelete={() => remove(t)} showDue={showDue} />
          ))}
        </Group>
      </Section>
    );

  const open = groups.overdue.length + groups.today.length + groups.upcoming.length + groups.someday.length;

  const composer = (
    <View style={[styles.composer, { backgroundColor: theme.surface }]}>
      <View style={[styles.inputRow, { backgroundColor: theme.fog }]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Add a task"
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel="New task"
          autoFocus={compose === '1'}
          onSubmitEditing={add}
          returnKeyType="done"
          maxLength={200}
          style={[styles.input, { color: theme.text }]}
        />
        <Tap
          onPress={add}
          disabled={saving || !title.trim()}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <Icon name="add" color={theme.onAccent} size={20} weight="bold" />
        </Tap>
      </View>
      <View style={styles.chips}>
        {WHEN.map((w) => (
          <Chip key={w.key} label={w.label} selected={when === w.key} onPress={() => setWhen(w.key)} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen back title="To do" subtitle={open ? `${open} open` : 'All clear'}>
      <View style={twoUp ? styles.twoUp : styles.stack}>
        <View style={[styles.stack, twoUp && styles.half]}>
          {composer}
          {data && open === 0 && (
            <View style={styles.empty}>
              <Blob shape="flower" color={BlobColors.lime} size={72} mood="wow" />
              <ThemedText type="bodyStrong">Nothing to do</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                Add a task above. Today’s show up on your Today screen too.
              </ThemedText>
            </View>
          )}
          {section('Overdue', groups.overdue)}
          {section('Today', groups.today, false)}
        </View>
        <View style={[styles.stack, twoUp && styles.half]}>
          {section('Coming up', groups.upcoming)}
          {section('Someday', groups.someday, false)}
          {section('Done this week', groups.done)}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  stack: { gap: Spacing.four },
  twoUp: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  half: { flex: 1, minWidth: 0 },
  composer: { borderRadius: Radius.large, padding: 12, gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.medium, paddingLeft: Spacing.three, padding: 5 },
  input: { flex: 1, minHeight: 44, fontSize: 17, fontFamily: Fonts.regular },
  addButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
});
