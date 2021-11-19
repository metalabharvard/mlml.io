precompile:
	npm run prebuild
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./about.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./events.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./members.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./meta.go
	cd scripts/api; env GOOS=linux GOARCH=amd64 go build ./projects.go
	mv scripts/api/about scripts/api/events scripts/api/members scripts/api/meta scripts/api/projects scripts/api/binaries/

local:
	npm run prebuild
	cd scripts/api; go build ./about.go
	cd scripts/api; go build ./events.go
	cd scripts/api; go build ./members.go
	cd scripts/api; go build ./meta.go
	cd scripts/api; go build ./projects.go
	mv scripts/api/about scripts/api/events scripts/api/members scripts/api/meta scripts/api/projects scripts/api/binaries/

about:
	cd scripts/api; go run about.go

events:
	cd scripts/api; go run events.go

members:
	cd scripts/api; go run members.go

meta:
	cd scripts/api; go run meta.go

projects:
	cd scripts/api; go run projects.go

fetch: about events members meta projects

build:
	./scripts/api/binaries/about
	./scripts/api/binaries/events
	./scripts/api/binaries/members
	./scripts/api/binaries/meta
	./scripts/api/binaries/projects
	hugo --gc --config config/config.json,config.toml --ignoreCache
