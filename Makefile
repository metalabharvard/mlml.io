p = scripts/api # source folder
t = binaries # target folder

precompile:
	npm run prebuild
	cd $(p); env GOOS=linux GOARCH=amd64 go build ./about.go
	cd $(p); env GOOS=linux GOARCH=amd64 go build ./events.go
	cd $(p); env GOOS=linux GOARCH=amd64 go build ./members.go
	cd $(p); env GOOS=linux GOARCH=amd64 go build ./meta.go
	cd $(p); env GOOS=linux GOARCH=amd64 go build ./projects.go
	mv $(p)/about $(p)/events $(p)/members $(p)/meta $(p)/projects $(p)/$(t)/

local:
	npm run prebuild
	cd $(p); go build ./about.go
	cd $(p); go build ./events.go
	cd $(p); go build ./members.go
	cd $(p); go build ./meta.go
	cd $(p); go build ./projects.go
	mv $(p)/about $(p)/events $(p)/members $(p)/meta $(p)/projects $(p)/$(t)/

about:
	cd $(p); go run about.go

events:
	cd $(p); go run events.go

members:
	cd $(p); go run members.go

meta:
	cd $(p); go run meta.go

projects:
	cd $(p); go run projects.go

fetch: about events members meta projects

build:
	cd $(p); $(t)/about
	cd $(p); $(t)/events
	cd $(p); $(t)/members
	cd $(p); $(t)/meta
	cd $(p); $(t)/projects
	hugo --gc --config config/config.json,config.toml --ignoreCache
