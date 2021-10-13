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
  Url string `json:"url"`
  Title string `json:"header_title"`
  Description string `json:"description"`
  Keywords string `json:"header_keywords"`
  FooterText string `json:"footer_text"`
  Twitter string `json:"contact_twitter"`
  Github string `json:"contact_github"`
  Email string `json:"contact_email"`
  Vimeo string `json:"contact_vimeo"`
  Youtube string `json:"contact_youtube"`
  Soundcloud string `json:"contact_soundcloud"`
  Facebook string `json:"contact_facebook"`
  Linkedin string `json:"contact_linkedin"`
  Instagram string `json:"contact_instagram"`
  LabelTimezoneBoston string `json:"label_timezone_boston"`
  LabelTimezoneBerlin string `json:"label_timezone_berlin"`
  LabelAlumniUpdate string `json:"label_alumni_update"`
  ErrorTitle string `json:"error_title"`
  ErrorText string `json:"error_text"`
}

type Params struct {
  Title string `json:"title"`
  Description string `json:"description,omitempty"`
  Keywords string `json:"keywords,omitempty"`
  Contact Contact `json:"contact"`
  Label Label `json:"label"`
}

type Contact struct {
  Twitter string `json:"twitter,omitempty"`
  Github string `json:"github,omitempty"`
  Email string `json:"email,omitempty"`
  Vimeo string `json:"vimeo,omitempty"`
  Youtube string `json:"youtube,omitempty"`
  Soundcloud string `json:"soundcloud,omitempty"`
  Facebook string `json:"facebook,omitempty"`
  Linkedin string `json:"linkedin,omitempty"`
  Instagram string `json:"instagram,omitempty"`
}

type Label struct {
  ErrorTitle string `json:"error_title,omitempty"`
  ErrorText string `json:"error_text,omitempty"`
  FooterText string `json:"footer_text,omitempty"`
  TimezoneLabelBoston string `json:"label_timezone_boston,omitempty"`
  TimezoneLabelBerlin string `json:"label_timezone_berlin,omitempty"`
  AlumniUpdate string `json:"label_alumni_update,omitempty"`
}

type Config struct {
  Title string `json:"title"`
  Url string `json:"baseURL"`
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
    Url: responseObject.Url,
    Params: Params{
      Title: responseObject.Title,
      Description: responseObject.Description,
      Keywords: responseObject.Keywords,
      Contact: Contact{
        Twitter: responseObject.Twitter,
        Github: responseObject.Github,
        Email: responseObject.Email,
        Vimeo: responseObject.Vimeo,
        Youtube: responseObject.Youtube,
        Soundcloud: responseObject.Soundcloud,
        Facebook: responseObject.Facebook,
        Linkedin: responseObject.Linkedin,
        Instagram: responseObject.Instagram,
      },
      Label: Label{
        ErrorTitle: responseObject.ErrorTitle,
        ErrorText: responseObject.ErrorText,
        FooterText: responseObject.FooterText,
        TimezoneLabelBoston: responseObject.LabelTimezoneBoston,
        TimezoneLabelBerlin: responseObject.LabelTimezoneBerlin,
        AlumniUpdate: responseObject.LabelAlumniUpdate,
      },
    },
  }

  file, _ := json.MarshalIndent(config, "", " ")

  _ = ioutil.WriteFile("config/config.json", file, 0644)
}