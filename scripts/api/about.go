package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "gopkg.in/yaml.v3"
  "os"
)

// Definieren der neuen, genesteten Struktur
type MetaData struct {
    Data struct {
        Attributes Meta `json:"attributes"`
    } `json:"data"`
}

type Meta struct {
  Intro string `json:"intro,omitempty"`
  Updated_at string `json:"updated_at,omitempty"`
  Created_at string `json:"created_at,omitempty"`
  Lastmod string `yaml:"lastmod,omitempty"`
  Date string `yaml:"date,omitempty"`
  Title string `yaml:"title,omitempty"`
  Header string `yaml:"header,omitempty"`
  Layout string
  Slug string
}

func main() {
  println("Requesting about")
  response, err := http.Get("http://192.168.178.121:1337/api/about")
  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  var responseObject MetaData
  err = json.Unmarshal(responseData, &responseObject)
  if err != nil {
    log.Fatal(err)
  }

  meta := responseObject.Data.Attributes

  meta.Layout = "about"
  meta.Slug = "about"
  meta.Title = "About"

  meta.Date = meta.CreatedAt
  meta.Lastmod = meta.UpdatedAt
  meta.Created_at = meta.CreatedAt
  meta.Updated_at = meta.UpdatedAt

  content := meta.Intro
  meta.Intro = ""

  file, _ := yaml.Marshal(meta)

    _ = ioutil.WriteFile("../../content/about.md", []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)

  // _ = ioutil.WriteFile("content/about.md", file, 0644)
  println("Requesting about finished")
}
