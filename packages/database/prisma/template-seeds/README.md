# Document template seeds

JSON files named `<tpl_doc_*_v1>.json` are produced by:

```bash
pnpm export:golden-templates --discover
# Fill scripts/golden-template-sources.json with workspace UUIDs
pnpm export:golden-templates
pnpm db:seed
```

Each file contains `contentYjsBase64` exported from golden workspaces (`elshadayrick7@gmail.com`, named C.1–E.2 per addendum).
