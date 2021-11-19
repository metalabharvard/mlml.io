package structs

type Format struct {
  Url string `yaml:"url,omitempty"`
  Ext string `yaml:"ext,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
}

type Formats struct {
  Large Format `yaml:"large,omitempty"`
  Medium Format `yaml:"medium,omitempty"`
  Small Format `yaml:"small,omitempty"`
  Thumbnail Format `yaml:"thumbnail,omitempty"`
}

type Picture struct {
  AlternativeText string `yaml:"alternativeText,omitempty"`
  Caption string `yaml:"caption,omitempty"`
  Url string `yaml:"url,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
  Ext string `yaml:"ext,omitempty"`
  Mime string `yaml:"mime,omitempty"`
  Formats Formats `yaml:"formats,omitempty"`
}