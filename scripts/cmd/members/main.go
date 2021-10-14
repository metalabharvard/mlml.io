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
  "strings"
  "time"
  "gopkg.in/yaml.v3"
)

type Project struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Event struct {
  Title string `yaml:"label"`
  Slug string `yaml:"slug"`
}

type Role struct {
  Role string `yaml:"role"`
  Position int `yaml:"position"`
}

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
  Url string `yaml:"url,omitempty"`
  Width int `yaml:"width,omitempty"`
  Height int `yaml:"height,omitempty"`
  Formats Formats `yaml:"formats,omitempty"`
}

type Response struct {
  Name string `yaml:"name"`
  Title string
  Roles []Role `yaml:"roles,omitempty"`
  IsAlumnus bool `yaml:"isAlumnus"`
  Rank float64 `yaml:"rank,omitempty"`
  RoleString string `yaml:"role_string,omitempty"`
  Intro string `yaml:"intro,omitempty"`
  Twitter string `yaml:"twitter,omitempty"`
  Mail string `yaml:"email,omitempty"`
  Website string `yaml:"website,omitempty"`
  Instagram string `yaml:"instagram,omitempty"`
  Start string `yaml:"start,omitempty"`
  Description string `yaml:"description,omitempty"`
  Updated_at string `yaml:"updated_at,omitempty"`
  Created_at string `yaml:"created_at,omitempty"`
  Lastmod string `yaml:"lastmod"`
  Date string `yaml:"date"`
  Slug string `yaml:"slug"`
  Events []Event `yaml:"events,omitempty"`
  Projects []Project `yaml:"projects,omitempty"`
  Picture Picture `yaml:"picture,omitempty"`
}

type Index struct {
  Lastmod string `yaml:"lastmod"`
}

func getPath(isAlumnus bool) string {
  if isAlumnus {
    return "alumni"
  } else {
    return "members"
  }
}

func calculateRoleRank(roles []Role) float64 {
  var rank float64 = 0.0
  for i, a := range roles {
    rank += float64(a.Position) * math.Pow(10, float64(-i))
  }
  for i := len(roles); i < 4; i++ {
    rank += 9 * math.Pow(10, float64(-i))
  }
  return math.Round(rank * 1000) / 1000
}

func createRoleString(roles []Role) string {
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

type ByRole []Role

func (a ByRole) Len() int           { return len(a) }
func (a ByRole) Less(i, j int) bool { return a[i].Position < a[j].Position }
func (a ByRole) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

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

  err = os.RemoveAll("content/members/")
  if err != nil {
    log.Fatal(err)
  }
  os.MkdirAll("content/members/", 0777)

  err = os.RemoveAll("content/alumni/")
  if err != nil {
    log.Fatal(err)
  }
  os.MkdirAll("content/alumni/", 0777)

  var responseObject []Response
  json.Unmarshal(responseData, &responseObject)

  s := []int{4, 2, 3, 1}
  sort.Ints(s)

  for _, element := range responseObject {
    Updated_at, _ := time.Parse(time.RFC3339, element.Updated_at)
    if Updated_at.After(Lastmod) {
      Lastmod = Updated_at
    }
    // println(getPath(isAlumnus))
    // println(fmt.Sprintf("content/%s/%s.md", getPath(isAlumnus), element.Slug))

    sort.Sort(ByRole(element.Roles))
    // fmt.Println(element.Roles)
    if !element.IsAlumnus {
      element.Rank = calculateRoleRank(element.Roles)
      element.RoleString = createRoleString(element.Roles)
    } else {
      element.RoleString = "Alumnus"
    }
    
    element.Name = strings.TrimSpace(element.Name)
    element.Title = strings.TrimSpace(element.Name)

    content := element.Description

    element.Description = ""

    element.Date = element.Created_at
    element.Lastmod = element.Updated_at

    element.Created_at = ""
    element.Updated_at = ""

    // if element.IsAlumnus {
    //   element.NoIndex = true
    // }

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("content/members/%s.md", element.Slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
  }

  var meta Index
  meta.Lastmod = Lastmod.Format(time.RFC3339)
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile("content/members/_index.md", []byte(fmt.Sprintf("---\n%s---", file)), 0644)
  println(fmt.Sprintf("%d elements added", len(responseObject)))
  println("Requesting members finished")
}