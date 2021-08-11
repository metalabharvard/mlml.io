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
  Keywords string `json:"keywords"`
  FooterText string `json:"footer_text"`
  Twitter string `json:"twitter"`
  Github string `json:"github"`
  Email string `json:"email"`
  Vimeo string `json:"vimeo"`
  Youtube string `json:"youtube"`
  Soundcloud string `json:"soundcloud"`
  Instagram string `json:"instagram"`
  ErrorTitle string `json:"error_title"`
  ErrorText string `json:"error_text"`
}

type Params struct {
  Description string `json:"description"`
  Keywords string `json:"keywords"`
  FooterText string `json:"footer_text"`
  Twitter string `json:"twitter"`
  Github string `json:"github"`
  Email string `json:"email"`
  Vimeo string `json:"vimeo"`
  Youtube string `json:"youtube"`
  Soundcloud string `json:"soundcloud"`
  Instagram string `json:"instagram"`
  ErrorTitle string `json:"error_title"`
  ErrorText string `json:"error_text"`
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
      Keywords: responseObject.Keywords,
      FooterText: responseObject.FooterText,
      Twitter: responseObject.Twitter,
      Github: responseObject.Github,
      Email: responseObject.Email,
      Vimeo: responseObject.Vimeo,
      Youtube: responseObject.Youtube,
      Soundcloud: responseObject.Soundcloud,
      Instagram: responseObject.Instagram,
      ErrorTitle: responseObject.ErrorTitle,
      ErrorText: responseObject.ErrorText,
    },
  }

  file, _ := json.MarshalIndent(config, "", " ")

  _ = ioutil.WriteFile("config/config.json", file, 0644)
}