import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { db } from '../db'
import migrations from '../db/migrations/migrations'
import { View, ActivityIndicator } from 'react-native'
import { seedExercices } from '../db/seed'

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations)

  useEffect(() => {
    if (success) seedExercices()
  }, [success])

  if (!success && !error) {
    return <View style={{ flex: 1 }}><ActivityIndicator style={{ flex: 1 }} /></View>
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="seance/[id]" options={{ title: 'Séance' }} />
      <Stack.Screen name="bloc/nouveau" options={{ title: 'Nouveau bloc' }} />
    </Stack>
  )
}
