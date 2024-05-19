# Metalab website

## Run locally

```bash
bun run dev
```

This runs Hugo and Svelte simultaneously via `npm-run-all`.

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

### Build Svelte

```bash
make precompile
```

## Netlify

Configuration for Netlify is in `netlify.toml`. It uses the `Makefile` to run `make build`.
