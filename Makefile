# source folder
p = scripts/api
# target folder
t = binaries

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
	# cd $(p); go run about.go
	bun $(p)/about.ts

events:
	cd $(p); go run events.go

members:
	cd $(p); go run members.go

members_ts:
	bun $(p)/members.ts

meta:
	#cd $(p); go run meta.go
	bun $(p)/meta.ts

projects:
	cd $(p); go run projects.go
	# bun $(p)/projects.ts

projects_ts:
	bun $(p)/projects.ts

fetch: about events members meta projects

links:
	cd blc; node blc.js

buildLinks:
	cd blc; ncc build blc.js -o bin -m

build:
	cd $(p); $(t)/about
	cd $(p); $(t)/events
	cd $(p); $(t)/members
	cd $(p); $(t)/meta
	cd $(p); $(t)/projects
	hugo --config config/config.json,config.toml --ignoreCache
