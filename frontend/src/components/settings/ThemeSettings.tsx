import { useTheme } from 'next-themes';
import { useThemeColors, hexToHsl, hslToHex } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Palette, RotateCcw, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const presetThemes = [
  { name: 'Default Green', primary: '142, 69%, 58%', secondary: '243, 75%, 59%' },
  { name: 'Ocean Blue', primary: '210, 100%, 50%', secondary: '180, 100%, 40%' },
  { name: 'Royal Purple', primary: '270, 70%, 60%', secondary: '300, 70%, 50%' },
  { name: 'Sunset Orange', primary: '25, 95%, 53%', secondary: '350, 80%, 55%' },
  { name: 'Forest Teal', primary: '175, 60%, 45%', secondary: '140, 50%, 40%' },
  { name: 'Rose Pink', primary: '340, 80%, 60%', secondary: '320, 70%, 50%' },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { colors, updateColor, resetColors } = useThemeColors();
  const { toast } = useToast();

  const handleColorChange = (key: 'primary' | 'secondary' | 'success' | 'warning', hexValue: string) => {
    const hsl = hexToHsl(hexValue);
    updateColor(key, hsl);
  };

  const applyPreset = (primary: string, secondary: string) => {
    updateColor('primary', primary);
    updateColor('secondary', secondary);
    toast({
      title: 'Theme Applied',
      description: 'Your brand colors have been updated.',
    });
  };

  const handleReset = () => {
    resetColors();
    toast({
      title: 'Theme Reset',
      description: 'Colors have been reset to defaults.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Dark Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance Mode
          </CardTitle>
          <CardDescription>Switch between light and dark mode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Light</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Dark</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preset Themes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Preset Themes
          </CardTitle>
          <CardDescription>Quick apply a color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {presetThemes.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto p-3 flex flex-col items-start gap-2 hover:border-primary"
                onClick={() => applyPreset(preset.primary, preset.secondary)}
              >
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.primary})` }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: `hsl(${preset.secondary})` }}
                  />
                </div>
                <span className="text-xs font-medium">{preset.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Brand Colors</CardTitle>
              <CardDescription>Fine-tune your brand colors</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(colors.primary)}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={hslToHex(colors.primary)}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1"
                  placeholder="#4ADE80"
                />
              </div>
              <p className="text-xs text-muted-foreground">Main brand color for buttons, links, and highlights</p>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(colors.secondary)}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={hslToHex(colors.secondary)}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1"
                  placeholder="#6366F1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Accent color for secondary elements</p>
            </div>

            {/* Success Color */}
            <div className="space-y-2">
              <Label>Success Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(colors.success)}
                  onChange={(e) => handleColorChange('success', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={hslToHex(colors.success)}
                  onChange={(e) => handleColorChange('success', e.target.value)}
                  className="flex-1"
                  placeholder="#22C55E"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for success states and positive indicators</p>
            </div>

            {/* Warning Color */}
            <div className="space-y-2">
              <Label>Warning Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={hslToHex(colors.warning)}
                  onChange={(e) => handleColorChange('warning', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={hslToHex(colors.warning)}
                  onChange={(e) => handleColorChange('warning', e.target.value)}
                  className="flex-1"
                  placeholder="#F59E0B"
                />
              </div>
              <p className="text-xs text-muted-foreground">Used for warnings and alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your theme looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success">
              <span className="text-sm font-medium">Success State</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-warning">
              <span className="text-sm font-medium">Warning State</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
