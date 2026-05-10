import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { seedExercices } from '../db/seed'

export default function RootLayout() {
  useEffect(() => {
    seedExercices()
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="seance/[id]" options={{ title: 'Séance' }} />
      <Stack.Screen name="bloc/nouveau" options={{ title: 'Nouveau bloc' }} />
      <Stack.Screen name="bloc/[id]" options={{ title: 'Calendrier du bloc' }} />
    </Stack>
  )
}
