import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { seedExercices } from '../db/seed'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function AppStack() {
  const { colors } = useTheme()
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.text }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="seance/[id]" options={{ title: 'Séance' }} />
      <Stack.Screen name="bloc/nouveau" options={{ title: 'Nouveau bloc' }} />
      <Stack.Screen name="bloc/[id]" options={{ title: 'Calendrier du bloc' }} />
    </Stack>
  )
}

export default function RootLayout() {
  useEffect(() => {
    seedExercices()
  }, [])

  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  )
}
