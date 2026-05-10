import { createContext, useContext, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { light, dark, Colors } from '../constants/colors'
import { useThemeStore } from '../store/themeStore'

type ThemeContextType = { colors: Colors; isDark: boolean }

const ThemeContext = createContext<ThemeContextType>({ colors: light, isDark: false })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const { override } = useThemeStore()
  const isDark = override !== null ? override === 'dark' : scheme === 'dark'
  return (
    <ThemeContext.Provider value={{ colors: isDark ? dark : light, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
