import { ComingAtStep, PageHeader } from '@/components/page-header';

export default function ChangesetPage() {
  return (
    <>
      <PageHeader
        title="Changeset"
        blurb="Le plan d’opérations à appliquer sur le repo du design system."
      />
      <ComingAtStep step="8">
        <p>
          La liste ordonnée et exécutable des opérations issues des décisions prises : quels tokens
          générer, quels alias re-pointer, quels call sites réécrire et où.
        </p>
        <p>Lisible par un humain, et directement applicable par un agent sur le design system.</p>
      </ComingAtStep>
    </>
  );
}
