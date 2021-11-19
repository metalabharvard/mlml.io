precompile:
	npm run prebuild
	cd scripts; env GOOS=linux GOARCH=amd64 go build ./cmd/about/about.go
	cd scripts; env GOOS=linux GOARCH=amd64 go build ./cmd/events/events.go
	cd scripts; env GOOS=linux GOARCH=amd64 go build ./cmd/members/members.go
	cd scripts; env GOOS=linux GOARCH=amd64 go build ./cmd/meta/meta.go
	cd scripts; env GOOS=linux GOARCH=amd64 go build ./cmd/projects/projects.go

local:
	npm run prebuild
	cd scripts; go build ./cmd/about/about.go
	cd scripts; go build ./cmd/events/events.go
	cd scripts; go build ./cmd/members/members.go
	cd scripts; go build ./cmd/meta/meta.go
	cd scripts; go build ./cmd/projects/projects.go

build:
	./scripts/about
	./scripts/events
	./scripts/members
	./scripts/meta
	./scripts/projects
	hugo --gc --config config/config.json,config.toml --ignoreCache