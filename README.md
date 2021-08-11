# Metalab website

```
hugo serve --config config/config.json,config.toml --ignoreCache
```

## Documentation
### Page content
Project, event and member pages can have advanced markdown snippets. These are mail links, and Vimeo and YouTube embeds.

#### Mail
```markdown
{{< cloakemail "jane.doe@example.com" >}}
```

#### Vimeo
```markdown
{{< vimeo id="146022717" title="My vimeo video" >}}
```

#### YouTube
```markdown
{{< youtube id="w7Ft2ymGmfc" title="A New Hugo Site in Under Two Minutes" >}}
```
