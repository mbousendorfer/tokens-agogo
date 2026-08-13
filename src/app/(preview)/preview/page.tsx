import { allSpecimens, findSpecimen, specimensByComponent } from '@/lib/specimens';
import { ForceStates } from './force-states';
import { FORCEABLE_STATES, type ForceableState } from './states';

/**
 * Le contenu de l'iframe de preview.
 *
 * `?specimen=<id>` isole un spécimen ; sans paramètre, tout est affiché, groupé par
 * composant. Le markup vient tel quel des stories du design system : on ne le
 * réécrit pas, sinon la preview ne prouve plus rien.
 */
export default async function PreviewPage({ searchParams }: PageProps<'/preview'>) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const id = first(params.specimen);
  const componentName = first(params.component);

  // `?state=hover` force l'état sur le spécimen, via les règles dérivées du CSS réel.
  const requested = first(params.state);
  const forced = FORCEABLE_STATES.includes(requested as ForceableState)
    ? (requested as ForceableState)
    : null;

  const only = id ? findSpecimen(id) : undefined;
  if (id && !only) {
    return <p style={{ font: '13px system-ui', padding: 24 }}>Spécimen inconnu : {id}</p>;
  }

  const groups = only
    ? [{ component: only.component, group: only.group, items: [only] }]
    : specimensByComponent().filter((g) => !componentName || g.component === componentName);

  const showHeadings = !only && !componentName;

  return (
    <div style={{ padding: only ? 24 : 32 }}>
      <ForceStates />
      {showHeadings && (
        <p style={{ font: '13px system-ui', color: '#666', margin: '0 0 24px' }}>
          {allSpecimens().length} spécimens, extraits des stories CSS-UI du design system.
        </p>
      )}

      {groups.map(({ component, group, items }) => (
        <section key={component} style={{ marginBottom: only ? 0 : 40 }}>
          {showHeadings && (
            <h2
              style={{
                font: '600 12px/1 system-ui',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: '#888',
                margin: '0 0 12px',
              }}
            >
              {group} · {component}
            </h2>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            {items.map((item) => (
              // La classe vit sur l'enveloppe : les règles dérivées savent descendre.
              <div
                key={item.id}
                data-specimen={item.id}
                className={forced ? `force-${forced}` : undefined}
                dangerouslySetInnerHTML={{ __html: item.html }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
