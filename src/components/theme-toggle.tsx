'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type Theme = 'light' | 'dark' | 'system';

const OPTIONS = [
  { value: 'light' as const, label: 'Clair', Icon: Sun },
  { value: 'dark' as const, label: 'Sombre', Icon: Moon },
  { value: 'system' as const, label: 'Système', Icon: Monitor },
];

/**
 * Le thème est porté par un cookie, lu par le layout serveur.
 *
 * C'est ce qui évite les trois plaies habituelles d'un sélecteur de thème : le flash
 * clair au chargement, le script inline de rattrapage, et la divergence
 * d'hydratation. Le serveur connaît déjà la valeur, donc il rend le bon état.
 *
 * Le sombre est le défaut : l'app est une chambre noire, et la preview du design
 * system — forcée en clair, faute de mode sombre côté DS — y devient une table
 * lumineuse. Le clair reste un vrai mode, pour travailler en plein jour.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  const choose = (value: Theme) => {
    setTheme(value);
    // Un an : le thème est une préférence, pas une session.
    document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax`;

    const dark =
      value === 'dark' ||
      (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  };

  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={theme}
      onValueChange={(value) => value && choose(value as Theme)}
      aria-label="Thème"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="px-2"
        >
          <Icon className="size-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
