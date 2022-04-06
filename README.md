# Metalab website

## Run locally
```bash
npm run dev
```

This runs Hugo and Svelte simultaneously via `npm-run-all`. In contrast, we prerender Svelte via `make precompile` so that Netlify only needs to compile Hugo.

## Fetch data
### Fetch individual endpoints
```bash
make about
make events
make members
make meta
make projects
```

### Fetch all endpoints
```bash
make fetch
```

### Rebuild website for deployment on Netlify
```bash
make precompile
```

This precompiles Svelte and the Go files.

## Netlify
Configuration for Netlify is in `netlify.toml`. It uses the `Makefile` to run `make build`.
