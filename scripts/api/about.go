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
  response, err := http.Get("https://metalab-strapi.herokuapp.com/about")

  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  var responseObject Meta
  json.Unmarshal(responseData, &responseObject)

  responseObject.Layout = "about"
  responseObject.Slug = "about"

  responseObject.Date = responseObject.Created_at
  responseObject.Lastmod = responseObject.Updated_at

  content := responseObject.Intro
  responseObject.Intro = ""

  file, _ := yaml.Marshal(responseObject)
    _ = ioutil.WriteFile("../../content/about.md", []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)

  // _ = ioutil.WriteFile("content/about.md", file, 0644)
  println("Requesting about finished")
}