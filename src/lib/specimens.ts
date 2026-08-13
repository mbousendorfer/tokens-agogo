import data from '../../data/specimens.json';

export type ArgTypeSpec = {
  control?: string;
  options?: (string | number | boolean)[];
  description?: string;
};

export type Specimen = {
  id: string;
  component: string;
  group: string;
  story: string;
  title: string;
  sourceFile: string;
  args: Record<string, unknown>;
  argTypes: Record<string, ArgTypeSpec>;
  /** Markup `.ap-*` réel, extrait des stories du design system. */
  html: string;
};

export type SpecimenData = {
  source: { ref: string; sha: string; storiesPath: string };
  counts: { files: number; specimens: number; skipped: number };
  skipped: { file: string; reason: string }[];
  specimens: Specimen[];
};

export const specimenData = data as SpecimenData;

export function allSpecimens(): Specimen[] {
  return specimenData.specimens;
}

export function findSpecimen(id: string): Specimen | undefined {
  return specimenData.specimens.find((s) => s.id === id);
}

/** Les spécimens groupés par composant, dans l'ordre des groupes du design system. */
export function specimensByComponent(): { component: string; group: string; items: Specimen[] }[] {
  const map = new Map<string, { component: string; group: string; items: Specimen[] }>();
  for (const specimen of specimenData.specimens) {
    const entry = map.get(specimen.component) ?? {
      component: specimen.component,
      group: specimen.group,
      items: [],
    };
    entry.items.push(specimen);
    map.set(specimen.component, entry);
  }
  return [...map.values()].sort(
    (a, b) => a.group.localeCompare(b.group) || a.component.localeCompare(b.component),
  );
}
