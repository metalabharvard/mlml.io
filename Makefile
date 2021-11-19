precompile:
	npm run prebuild
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./src/about.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./src/events.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./src/members.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./src/meta.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./src/projects.go
	mv scripts/api/about scripts/api/events scripts/api/members scripts/api/meta scripts/api/projects scripts/api/binaries/

local:
	npm run prebuild
	cd scripts/api; go build ./src/about.go
	cd scripts/api; go build ./src/events.go
	cd scripts/api; go build ./src/members.go
	cd scripts/api; go build ./src/meta.go
	cd scripts/api; go build ./src/projects.go
	mv scripts/api/about scripts/api/events scripts/api/members scripts/api/meta scripts/api/projects scripts/api/binaries/

build:
	./scripts/api/binaries/about
	./scripts/api/binaries/events
	./scripts/api/binaries/members
	./scripts/api/binaries/meta
	./scripts/api/binaries/projects
	hugo --gc --config config/config.json,config.toml --ignoreCache