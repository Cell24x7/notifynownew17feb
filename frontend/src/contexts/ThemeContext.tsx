import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetColors: () => void;
}

const defaultColors: ThemeColors = {
  primary: '142, 69%, 58%',
  secondary: '243, 75%, 59%',
  success: '142, 69%, 58%',
  warning: '38, 92%, 50%',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(() => {
    const saved = localStorage.getItem('theme-colors');
    return saved ? JSON.parse(saved) : defaultColors;
  });

  useEffect(() => {
    // Apply colors to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.secondary);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-accent', colors.secondary);
    root.style.setProperty('--sidebar-ring', colors.primary);
    
    // Save to localStorage
    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, [colors]);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const resetColors = () => {
    setColors(defaultColors);
    localStorage.removeItem('theme-colors');
  };

  return (
    <ThemeContext.Provider value={{ colors, updateColor, resetColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeColors must be used within a ThemeProvider');
  }
  return context;
}

// Utility to convert hex to HSL
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

// Utility to convert HSL string to hex
export function hslToHex(hsl: string): string {
  const [h, s, l] = hsl.split(',').map((part) => parseFloat(part.trim().replace('%', '')));
  
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
