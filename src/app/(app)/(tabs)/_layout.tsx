import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuickAdd } from '@/components/quick-add';
import { AddButton, TabBarShell, TabButton } from '@/components/tab-bar';
import { RailWidth } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

export default function TabsLayout() {
  const [adding, setAdding] = useState(false);
  const { railed } = useLayout();

  const add = <AddButton open={adding} onPress={() => setAdding((a) => !a)} />;
  return (
    <View style={styles.fill}>
      <Tabs>
        {/* Desktop leaves room for the rail on the left. */}
        <TabSlot style={[styles.fill, railed && { marginLeft: RailWidth }]} />
        {/* Below the bar in z-order, so the + stays visible and turns into a close button. */}
        <QuickAdd open={adding} onClose={() => setAdding(false)} />
        <TabList asChild>
          <TabBarShell rail={railed}>
            {railed && add}
            <TabTrigger name="index" href="/" asChild>
              <TabButton icon="home" label="Today" />
            </TabTrigger>
            <TabTrigger name="food" href="/food" asChild>
              <TabButton icon="food" label="Food" />
            </TabTrigger>
            {!railed && add}
            <TabTrigger name="habits" href="/habits" asChild>
              <TabButton icon="habit" label="Habits" />
            </TabTrigger>
            <TabTrigger name="focus" href="/focus" asChild>
              <TabButton icon="focus" label="Focus" />
            </TabTrigger>
          </TabBarShell>
        </TabList>
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
