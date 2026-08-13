'use client';

import { Check, GitBranch, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Branch = { name: string; sha: string; subject: string; date: string };

/**
 * La branche du design system que l'app lit.
 *
 * Les scripts lisent par `git show <ref>:<path>`, donc changer de branche ici ne
 * touche pas au checkout du design system : on régénère les snapshots pour la ref
 * choisie. C'est ce qui permet de suivre une branche de migration au fil de son
 * avancement, sans jamais déplacer le travail de quelqu'un d'autre.
 *
 * L'opération est longue — tout le pipeline repasse — donc elle est explicite.
 */
export function BranchPicker({ current, sha }: { current: string; sha: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || branches.length) return;
    fetch('/api/branches')
      .then((response) => response.json())
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => setBranches([]));
  }, [open, branches.length]);

  const choose = async (ref: string) => {
    setSyncing(ref);
    setError(null);
    const response = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref }),
    });
    setSyncing(null);

    if (!response.ok) {
      setError((await response.json()).output ?? 'Échec de la synchronisation.');
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-haspopup="listbox" aria-expanded={open}>
          <Badge variant="secondary" className="gap-1.5 font-mono text-[11px]">
            <GitBranch className="size-3" />
            {current}
            <span className="text-muted-foreground">{sha}</span>
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <Command>
          <CommandInput placeholder="Chercher une branche…" />
          <CommandList className="max-h-80">
            <CommandEmpty className="py-6 text-center text-xs">
              Aucune branche — le repo design system n’est lisible qu’en mode local.
            </CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.name}
                  value={branch.name}
                  onSelect={() => choose(branch.name)}
                  disabled={Boolean(syncing)}
                  className="items-start gap-2"
                >
                  {syncing === branch.name ? (
                    <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin" />
                  ) : (
                    <Check
                      className={cn(
                        'mt-0.5 size-3 shrink-0',
                        branch.name === current ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">{branch.name}</span>
                    <span className="text-muted-foreground block truncate text-[11px]">
                      {branch.subject}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
                    {branch.date}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <p className="text-muted-foreground border-t px-3 py-2 text-[11px] leading-relaxed">
            {syncing
              ? `Régénération des snapshots sur ${syncing}… tout le pipeline repasse.`
              : (error ??
                'Changer de branche relit les tokens, les spécimens et l’index de déclarations pour cette ref.')}
          </p>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
