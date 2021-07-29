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
  Url string `json:"url"`
  Ext string `json:"ext"`
  Width int `json:"width"`
  Height int `json:"height"`
}

type Formats struct {
  Large Format `json:"large"`
  Medium Format `json:"medium"`
  Small Format `json:"small"`
  Thumbnail Format `json:"thumbnail"`
}

type Picture struct {
  AlternativeText string `json:"alternativeText"`
  Url string `json:"url"`
  Width int `json:"width"`
  Height int `json:"height"`
  Formats Formats `json:"formats"`
}

type Response struct {
  Name string `json:"name"`
  Roles []Role `json:"roles"`
  Rank float64 `json:"rank"`
  Twitter string `json:"twitter"`
  Mail string `json:"email"`
  Website string `json:"website"`
  Instagram string `json:"instagram"`
  Start string `json:"start"`
  Description string `json:"description"`
  Updated_at string `json:"updated_at"`
  Created_at string `json:"created_at"`
  Slug string `json:"slug"`
  Events []Event `json:"events"`
  Projects []Project `json:"projects"`
  Picture Picture `json:"picture"`
}

func checkForAlumnusRole(roles []Role) bool {
  for _, a := range roles {
    if a.Role == "Alumnus" {
      return true
    }
  }
  return false
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
    isAlumnus := checkForAlumnusRole(element.Roles)
    // println(getPath(isAlumnus))
    // println(fmt.Sprintf("content/%s/%s.md", getPath(isAlumnus), element.Slug))

    sort.Sort(ByRole(element.Roles))
    // fmt.Println(element.Roles)
    element.Rank = calculateRoleRank(element.Roles)
    
    element.Name = strings.TrimSpace(element.Name)

    file, _ := json.MarshalIndent(element, "", " ")
    _ = ioutil.WriteFile(fmt.Sprintf("content/%s/%s.md", getPath(isAlumnus), element.Slug), file, 0644)
  }
}