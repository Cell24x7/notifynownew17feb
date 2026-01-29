import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
];

export function LanguageSettings() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const { toast } = useToast();

  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    const language = languages.find(l => l.code === code);
    toast({
      title: 'Language Updated',
      description: `Your language has been changed to ${language?.name}.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Language Preferences</CardTitle>
              <CardDescription>
                Choose your preferred language for the application interface
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={cn(
                  'relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  selectedLanguage === language.code
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <span className="text-3xl">{language.flag}</span>
                <div className="flex-1">
                  <p className="font-medium">{language.name}</p>
                  <p className="text-sm text-muted-foreground">{language.native}</p>
                </div>
                {selectedLanguage === language.code && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
