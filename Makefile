# source folder
p = scripts/api

precompile:
	bun run svelte:prod

about:
	# cd $(p); go run about.go
	bun $(p)/about.ts

events:
	# cd $(p); go run events.go
	bun $(p)/events.ts

members:
	# cd $(p); go run members.go
	bun $(p)/members.ts

meta:
	# cd $(p); go run meta.go
	bun $(p)/meta.ts

projects:
	# cd $(p); go run projects.go
	bun $(p)/projects.ts

fetch: about events members meta projects

links:
	cd blc; node blc.js

buildLinks:
	cd blc; ncc build blc.js -o bin -m

build: about events members meta projects
	hugo --config config/config.json,config.toml --ignoreCache
