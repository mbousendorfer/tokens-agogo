# Snapshots Figma

Un dossier par fichier Figma, un JSON daté par export :

```
figma-snapshots/
└── ZXNsdFTc17AM5qk6DZc07A/
    ├── 2026-08-13-variables.json
    └── 2026-08-20-variables.json
```

Ces fichiers sont **commités**. Le `git diff` entre deux snapshots est le changelog
Figma — sans API, sans webhook, sans polling.

Les produire avec le plugin : voir [`figma-plugin/README.md`](../figma-plugin/README.md).
