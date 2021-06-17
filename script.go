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
  Title string `json:"Title"`
  Description string `json:"Description"`
}

type Params struct {
  Description string `json:"description"`
}

type Config struct {
  Title string `json:"title"`
  Params Params `json:"params"`
}

func main() {
  response, err := http.Get("https://metalab-strapi.herokuapp.com/meta")

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

  config := Config{
    Title: responseObject.Title,
    Params: Params{
      Description: responseObject.Description,
    },
  }

  file, _ := json.MarshalIndent(config, "", " ")

  _ = ioutil.WriteFile("config/config.json", file, 0644)
}