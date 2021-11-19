precompile:
	GOOS=linux
	GOARCH=amd64
	GOBIN=${PWD}/scripts/ go get ./...
	GOBIN=${PWD}/scripts/ go install ./...

build:
	./scripts/about
	./scripts/events
	./scripts/members
	./scripts/meta
	./scripts/projects
	hugo --gc --config config/config.json,config.toml --ignoreCache