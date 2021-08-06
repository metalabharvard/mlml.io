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
  "github.com/goccy/go-yaml"
)

type Project struct {
  Title string `json:"title"`
  Slug string `json:"slug"`
}

type Event struct {
  Title string `json:"title"`
  Slug string `json:"slug"`
}

type Role struct {
  Role string `json:"role"`
  Position int `json:"position"`
}

type Format struct {
  Url string `json:"url,omitempty"`
  Ext string `json:"ext,omitempty"`
  Width int `json:"width,omitempty"`
  Height int `json:"height,omitempty"`
}

type Formats struct {
  Large Format `json:"large,omitempty"`
  Medium Format `json:"medium,omitempty"`
  Small Format `json:"small,omitempty"`
  Thumbnail Format `json:"thumbnail,omitempty"`
}

type Picture struct {
  AlternativeText string `json:"alternativeText,omitempty"`
  Url string `json:"url,omitempty"`
  Width int `json:"width,omitempty"`
  Height int `json:"height,omitempty"`
  Formats Formats `json:"formats,omitempty"`
}

type Response struct {
  Name string `json:"name"`
  Title string
  Roles []Role `json:"roles,omitempty"`
  IsAlumnus bool `json:"isAlumnus"`
  Rank float64 `json:"rank"`
  RoleString string `json:"role_string,omitempty"`
  Twitter string `json:"twitter,omitempty"`
  Mail string `json:"email,omitempty"`
  Website string `json:"website,omitempty"`
  Instagram string `json:"instagram,omitempty"`
  Start string `json:"start,omitempty"`
  Description string `json:"description,omitempty"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Slug string `json:"slug"`
  Events []Event `json:"events,omitempty"`
  Projects []Project `json:"projects,omitempty"`
  Picture Picture `json:"picture,omitempty"`
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
  response, err := http.Get("https://metalab-strapi.herokuapp.com/members")

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
    // println(getPath(isAlumnus))
    // println(fmt.Sprintf("content/%s/%s.md", getPath(isAlumnus), element.Slug))

    sort.Sort(ByRole(element.Roles))
    // fmt.Println(element.Roles)
    element.Rank = calculateRoleRank(element.Roles)
    element.RoleString = createRoleString(element.Roles)
    
    element.Name = strings.TrimSpace(element.Name)
    element.Title = strings.TrimSpace(element.Name)

    content := element.Description

    element.Description = ""

    file, _ := yaml.Marshal(element)
    _ = ioutil.WriteFile(fmt.Sprintf("content/%s/%s.md", getPath(element.IsAlumnus), element.Slug), []byte(fmt.Sprintf("---\n%s\n---\n%s", file, content)), 0644)
  }
}