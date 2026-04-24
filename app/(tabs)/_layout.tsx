import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Séances' }} />
      <Tabs.Screen name="historique" options={{ title: 'Historique' }} />
      <Tabs.Screen name="parametres" options={{ title: 'Paramètres' }} />
    </Tabs>
  )
}
