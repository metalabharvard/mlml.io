package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
)

type Meta struct {
  Intro string `json:"intro"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Title string
  Layout string
  Slug string
}

func main() {
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

  responseObject.Title = "About"
  responseObject.Layout = "about"
  responseObject.Slug = "about"

  file, _ := json.MarshalIndent(responseObject, "", " ")

  _ = ioutil.WriteFile("content/about.md", file, 0644)
}