package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "sort"
  "math"
  "time"
  "gopkg.in/yaml.v3"
  stru "api/structs"
  utils "api/utils"
)

type Response struct {
  Name string `yaml:"name"`
  Title string
  Roles []stru.Role `yaml:"roles,omitempty"`
  IsAlumnus bool `yaml:"isAlumnus"`
  Rank float64 `yaml:"rank,omitempty"`
  RoleString string `yaml:"role_string,omitempty"`
  Intro string `yaml:"intro,omitempty"`
  Twitter string `yaml:"twitter,omitempty"`
  Email string `yaml:"email,omitempty"`
  Website string `yaml:"website,omitempty"`
  Instagram string `yaml:"instagram,omitempty"`
  Youtube string `yaml:"youtube,omitempty"`
  Soundcloud string `yaml:"soundcloud,omitempty"`
  Github string `yaml:"github,omitempty"`
  Vimeo string `yaml:"vimeo,omitempty"`
  Start string `yaml:"start,omitempty"`
  Description string `yaml:"description,omitempty"`
  Updated_at string `yaml:"updated_at,omitempty"`
  Created_at string `yaml:"created_at,omitempty"`
  Lastmod string `yaml:"lastmod"`
  Date string `yaml:"date"`
  Slug string `yaml:"slug"`
  Events []stru.Event `yaml:"events,omitempty"`
  Projects []stru.Project `yaml:"projects,omitempty"`
  Picture stru.Picture `yaml:"picture,omitempty"`
}

func calculateRoleRank(roles []stru.Role) float64 {
  var rank float64 = 0.0
  for i, a := range roles {
    rank += float64(a.Position) * math.Pow(10, float64(-i))
  }
  for i := len(roles); i < 4; i++ {
    rank += 9 * math.Pow(10, float64(-i))
  }
  return math.Round(rank * 1000) / 1000
}

func createRoleString(roles []stru.Role) string {
  var role string = ""
  for i := 0; i < len(roles); i++ {
    role += roles[i].Role
    if i < len(roles) - 2 {
      role += ", "
    } else if i == len(roles) - 2 {
      role += " and "
    }
  }
  return role
}

func main() {
  println("Requesting members")
  response, err := http.Get("https://metalab-strapi.herokuapp.com/members")

  var Lastmod time.Time;

  if err != nil {
    fmt.Print(err.Error())
    os.Exit(1)
  }

  responseData, err := ioutil.ReadAll(response.Body)
  if err != nil {
    log.Fatal(err)
  }

  FOLDER := "../../content/members/"

  utils.CleanFolder(FOLDER)

  var responseObject []Response
  json.Unmarshal(responseData, &responseObject)

  for _, element := range responseObject {
    Lastmod = utils.GetLastmod(element.Updated_at, Lastmod)

    sort.Sort(stru.ByRole(element.Roles))

    if !element.IsAlumnus {
      element.Rank = calculateRoleRank(element.Roles)
      element.RoleString = createRoleString(element.Roles)
    } else {
      element.RoleString = "Alumnus"
    }
    
    element.Name = utils.Trim(element.Name)
    element.Title = utils.Trim(element.Name)

    content := element.Description

    element.Description = ""

    element.Date = element.Created_at
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""

    element.Projects = utils.CleanProjects(element.Projects)
    element.Events = utils.CleanEvents(element.Events)

    sort.Sort(stru.ProjectsByName(element.Projects))
    sort.Sort(stru.EventsByName(element.Events))

    // We convert all images to grayscale and also scale down the original image to max 2000 pixels
    element.Picture.Url = utils.ImageMaxWidth(utils.ConvertToGrayscale(element.Picture.Url))
    element.Picture.Formats.Thumbnail.Url = utils.ConvertToGrayscale(element.Picture.Formats.Thumbnail.Url)
    element.Picture.Formats.Small.Url = utils.ConvertToGrayscale(element.Picture.Formats.Small.Url)
    element.Picture.Formats.Medium.Url = utils.ConvertToGrayscale(element.Picture.Formats.Medium.Url)
    element.Picture.Formats.Large.Url = utils.ConvertToGrayscale(element.Picture.Formats.Large.Url)

    element.Name = utils.Trim(element.Name)
    element.Email = utils.Trim(element.Email)
    element.Website = utils.Trim(element.Website)
    element.Instagram = utils.Trim(element.Instagram)

    file, _ := yaml.Marshal(element)
    utils.WriteToMarkdown(FOLDER, element.Slug, file, content)
  }

  utils.WriteLastMod(FOLDER, Lastmod, "Members")

  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting members finished")
}