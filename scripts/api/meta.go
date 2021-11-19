package main

import (
  "encoding/json"
  "fmt"
  "io/ioutil"
  "log"
  "net/http"
  "os"
  "gopkg.in/yaml.v3"
  "strings"
)

type Index struct {
  Title string `yaml:"title"`
  Slug string `yaml:"slug"`
}

type Preview struct {
  Url string `yaml:"url,omitempty"`
}

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
  HostsBoth string `json:"hostsBoth"`
  HostsDefault string `json:"hostsDefault"`
  HostsHeadline string `json:"hostsHeadline"`
  SocialFacebookTitle string `json:"socialFacebookTitle"`
  SocialGithubTitle string `json:"socialGithubTitle"`
  SocialHomepageTitle string `json:"socialHomepageTitle"`
  SocialInstagramTitle string `json:"socialInstagramTitle"`
  SocialLinkedinTitle string `json:"socialLinkedinTitle"`
  SocialEmailTitle string `json:"socialEmailTitle"`
  SocialSoundcloudTitle string `json:"socialSoundcloudTitle"`
  SocialTwitterTitle string `json:"socialTwitterTitle"`
  SocialVimeoTitle string `json:"socialVimeoTitle"`
  SocialYouTubeTitle string `json:"socialYouTubeTitle"`
  SocialMetalabSelf string `json:"socialMetalabSelf"`
  RelatedMembers string `json:"relatedMembers"`
  RelatedProjects string `json:"relatedProjects"`
  RelatedEvents string `json:"relatedEvents"`
  RelatedLabelMembers string `json:"relatedLabelMembers"`
  RelatedLabelProjects string `json:"relatedLabelProjects"`
  RelatedLabelEvents string `json:"relatedLabelEvents"`
  BoxCollaborator string `json:"boxCollaborator"`
  BoxTime string `json:"boxTime"`
  BoxHost string `json:"boxHost"`
  BoxLocation string `json:"boxLocation"`
  BoxType string `json:"boxType"`
  BoxFunder string `json:"boxFunder"`
  RelatedLabelLinks string `json:"relatedLabelLinks"`
  RelatedLabelPressArticles string `json:"relatedLabelPressArticles"`
  MemberAlumnus string `json:"memberAlumnus"`
  AriaTimezoneBoston string `json:"ariaTimezoneBoston"`
  AriaTimezoneBerlin string `json:"ariaTimezoneBerlin"`
  TimezoneBostonAbbr string `json:"timezoneBostonAbbr"`
  TimezoneBerlinAbbr string `json:"timezoneBerlinAbbr"`
  AriaProfilePicture string `json:"ariaProfilePicture"`
  AriaGeneralPicture string `json:"ariaGeneralPicture"`
  ExternalProject string `json:"externalProject"`
  ExternalEvent string `json:"externalEvent"`
  DefaultMediation string `json:"defaultMediation"`
  DefaultEventCategory string `json:"defaultEventCategory"`
  ProjectRSS string `json:"projectRSS"`
  EventRSS string `json:"eventRSS"`
  Preview Preview `yaml:"preview,omitempty"`
  Images []string `yaml:"images,omitempty"`
  PagePublishedText string `json:"pagePublishedText"`
  PageEditedText string `json:"pageEditedText"`
  PagePublishedFormat string `json:"pagePublishedFormat"`
  SiteEditedText string `json:"siteEditedText"`
  SiteEditedFormat string `json:"siteEditedFormat"`
  MaxNumberFeaturedProjects int `json:"maxNumberFeaturedProjects"`
}

type Params struct {
  Title string `json:"title"`
  Description string `json:"description,omitempty"`
  Keywords string `json:"keywords,omitempty"`
  Label Label `json:"label"`
  Images []string `yaml:"images,omitempty"`
  MaxNumberFeaturedProjects int `json:"maxNumberFeaturedProjects"`
}

type Social struct {
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
  HostsBoth string `json:"hostsBoth"`
  HostsDefault string `json:"hostsDefault"`
  // HostsHeadline string `json:"hostsHeadline"`
  SocialFacebookTitle string `json:"socialFacebookTitle"`
  SocialGithubTitle string `json:"socialGithubTitle"`
  SocialHomepageTitle string `json:"socialHomepageTitle"`
  SocialInstagramTitle string `json:"socialInstagramTitle"`
  SocialLinkedinTitle string `json:"socialLinkedinTitle"`
  SocialEmailTitle string `json:"socialEmailTitle"`
  SocialSoundcloudTitle string `json:"socialSoundcloudTitle"`
  SocialTwitterTitle string `json:"socialTwitterTitle"`
  SocialVimeoTitle string `json:"socialVimeoTitle"`
  SocialYouTubeTitle string `json:"socialYouTubeTitle"`
  SocialMetalabSelf string `json:"socialMetalabSelf"`
  RelatedMembers string `json:"relatedMembers"`
  RelatedProjects string `json:"relatedProjects"`
  RelatedEvents string `json:"relatedEvents"`
  RelatedLabelMembers string `json:"relatedLabelMembers"`
  RelatedLabelProjects string `json:"relatedLabelProjects"`
  RelatedLabelEvents string `json:"relatedLabelEvents"`
  BoxCollaborator string `json:"boxCollaborator"`
  BoxTime string `json:"boxTime"`
  BoxHost string `json:"boxHost"`
  BoxLocation string `json:"boxLocation"`
  BoxType string `json:"boxType"`
  BoxFunder string `json:"boxFunder"`
  RelatedLabelLinks string `json:"relatedLabelLinks"`
  RelatedLabelPressArticles string `json:"relatedLabelPressArticles"`
  MemberAlumnus string `json:"memberAlumnus"`
  AriaTimezoneBoston string `json:"ariaTimezoneBoston"`
  AriaTimezoneBerlin string `json:"ariaTimezoneBerlin"`
  TimezoneBostonAbbr string `json:"timezoneBostonAbbr"`
  TimezoneBerlinAbbr string `json:"timezoneBerlinAbbr"`
  AriaProfilePicture string `json:"ariaProfilePicture"`
  AriaGeneralPicture string `json:"ariaGeneralPicture"`
  ExternalProject string `json:"externalProject"`
  ExternalEvent string `json:"externalEvent"`
  DefaultMediation string `json:"defaultMediation"`
  DefaultEventCategory string `json:"defaultEventCategory"`
  ProjectRSS string `json:"projectRSS"`
  EventRSS string `json:"eventRSS"`
  PagePublishedText string `json:"pagePublishedText"`
  PageEditedText string `json:"pageEditedText"`
  PagePublishedFormat string `json:"pagePublishedFormat"`
  SiteEditedText string `json:"siteEditedText"`
  SiteEditedFormat string `json:"siteEditedFormat"`
}

type Config struct {
  Title string `json:"title"`
  Url string `json:"baseURL"`
  Params Params `json:"params"`
  Social Social `json:"social"`
}

func convertToPreviewImage(url string) string {
  var str string = strings.Replace(url, "upload/", "upload/ar_1200:600,c_crop/c_limit,h_1200,w_600/", 1)
  str = strings.Replace(str, ".gif", ".jpg", 1)
  return str
}

func addIndexPage(id string, str string) {
  var meta Index
  meta.Title = fmt.Sprintf(str, strings.Title(id))
  meta.Slug = id
  file, _ := yaml.Marshal(meta)
  _ = ioutil.WriteFile(fmt.Sprintf("../../content/host/%s/_index.md", id), []byte(fmt.Sprintf("---\n%s---", file)), 0644)
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
    Social: Social{
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
    Params: Params{
      Title: responseObject.Title,
      Description: responseObject.Description,
      Keywords: responseObject.Keywords,
      MaxNumberFeaturedProjects: responseObject.MaxNumberFeaturedProjects,
      Label: Label{
        ErrorTitle: responseObject.ErrorTitle,
        ErrorText: responseObject.ErrorText,
        FooterText: responseObject.FooterText,
        TimezoneLabelBoston: responseObject.LabelTimezoneBoston,
        TimezoneLabelBerlin: responseObject.LabelTimezoneBerlin,
        AlumniUpdate: responseObject.LabelAlumniUpdate,
        HostsBoth: responseObject.HostsBoth,
        HostsDefault: responseObject.HostsDefault,
        // HostsHeadline: responseObject.HostsHeadline,
        SocialFacebookTitle: responseObject.SocialFacebookTitle,
        SocialGithubTitle: responseObject.SocialGithubTitle,
        SocialHomepageTitle: responseObject.SocialHomepageTitle,
        SocialInstagramTitle: responseObject.SocialInstagramTitle,
        SocialLinkedinTitle: responseObject.SocialLinkedinTitle,
        SocialEmailTitle: responseObject.SocialEmailTitle,
        SocialSoundcloudTitle: responseObject.SocialSoundcloudTitle,
        SocialTwitterTitle: responseObject.SocialTwitterTitle,
        SocialVimeoTitle: responseObject.SocialVimeoTitle,
        SocialYouTubeTitle: responseObject.SocialYouTubeTitle,
        SocialMetalabSelf: responseObject.SocialMetalabSelf,
        RelatedMembers: responseObject.RelatedMembers,
        RelatedProjects: responseObject.RelatedProjects,
        RelatedEvents: responseObject.RelatedEvents,
        RelatedLabelMembers: responseObject.RelatedLabelMembers,
        RelatedLabelProjects: responseObject.RelatedLabelProjects,
        RelatedLabelEvents: responseObject.RelatedLabelEvents,
        BoxCollaborator: responseObject.BoxCollaborator,
        BoxTime: responseObject.BoxTime,
        BoxHost: responseObject.BoxHost,
        BoxLocation: responseObject.BoxLocation,
        BoxType: responseObject.BoxType,
        BoxFunder: responseObject.BoxFunder,
        RelatedLabelLinks: responseObject.RelatedLabelLinks,
        RelatedLabelPressArticles: responseObject.RelatedLabelPressArticles,
        MemberAlumnus: responseObject.MemberAlumnus,
        AriaTimezoneBoston: responseObject.AriaTimezoneBoston,
        AriaTimezoneBerlin: responseObject.AriaTimezoneBerlin,
        TimezoneBostonAbbr: responseObject.TimezoneBostonAbbr,
        TimezoneBerlinAbbr: responseObject.TimezoneBerlinAbbr,
        AriaProfilePicture: responseObject.AriaProfilePicture,
        AriaGeneralPicture: responseObject.AriaGeneralPicture,
        ExternalProject: responseObject.ExternalProject,
        ExternalEvent: responseObject.ExternalEvent,
        DefaultMediation: responseObject.DefaultMediation,
        DefaultEventCategory: responseObject.DefaultEventCategory,
        ProjectRSS: responseObject.ProjectRSS,
        EventRSS: responseObject.EventRSS,
        PagePublishedText: responseObject.PagePublishedText,
        PageEditedText: responseObject.PageEditedText,
        PagePublishedFormat: responseObject.PagePublishedFormat,
        SiteEditedText: responseObject.SiteEditedText,
        SiteEditedFormat: responseObject.SiteEditedFormat,
      },
    },
  }

  if responseObject.Preview.Url != "" {
    config.Params.Images = []string{convertToPreviewImage(responseObject.Preview.Url)}
  }

  file, _ := json.MarshalIndent(config, "", " ")

  _ = ioutil.WriteFile("../../config/config.json", file, 0644)

  addIndexPage("berlin", responseObject.HostsHeadline)
  addIndexPage("harvard", responseObject.HostsHeadline)
}