import {
  writeToMarkdown,
  fetchSingleFromStrapi,
  writeToJSON,
  addIndexPage,
  convertToPreviewImage,
  convertToLogo,
} from "./utils";

const fetchMetaData = async () => {
  try {
    const responseObject = await fetchSingleFromStrapi(
      "meta",
      "populate=preview",
    );

    const config = {
      title: responseObject.header_title,
      baseURL: responseObject.url,
      params: {
        title: responseObject.header_title,
        description: responseObject.description,
        homeIntro: responseObject.HomeIntro,
        homeLink: responseObject.HomeLink,
        keywords: responseObject.header_keywords,
        label: {
          error_title: responseObject.error_title,
          error_text: responseObject.error_text,
          footer_text: responseObject.footer_text,
          label_timezone_boston: responseObject.label_timezone_boston,
          label_timezone_berlin: responseObject.label_timezone_berlin,
          label_alumni_update: responseObject.label_alumni_update,
          hostsBoth: responseObject.hostsBoth,
          hostsDefault: responseObject.hostsDefault,
          // HostsHeadline: responseObject.hostsHeadline,
          socialFacebookTitle: responseObject.socialFacebookTitle,
          socialGithubTitle: responseObject.socialGithubTitle,
          socialHomepageTitle: responseObject.socialHomepageTitle,
          socialInstagramTitle: responseObject.socialInstagramTitle,
          socialLinkedinTitle: responseObject.socialLinkedinTitle,
          socialEmailTitle: responseObject.socialEmailTitle,
          socialSoundcloudTitle: responseObject.socialSoundcloudTitle,
          socialTwitterTitle: responseObject.socialTwitterTitle,
          socialVimeoTitle: responseObject.socialVimeoTitle,
          socialYouTubeTitle: responseObject.socialYouTubeTitle,
          socialMastodonTitle: responseObject.socialMastodonTitle,
          socialMetalabSelf: responseObject.socialMetalabSelf,
          relatedMembers: responseObject.relatedMembers,
          relatedProjects: responseObject.relatedProjects,
          relatedEvents: responseObject.relatedEvents,
          relatedLabelMembers: responseObject.relatedLabelMembers,
          relatedLabelProjects: responseObject.relatedLabelProjects,
          relatedLabelEvents: responseObject.relatedLabelEvents,
          boxCollaborator: responseObject.boxCollaborator,
          boxTime: responseObject.boxTime,
          boxHost: responseObject.boxHost,
          boxLocation: responseObject.boxLocation,
          boxType: responseObject.boxType,
          boxFunder: responseObject.boxFunder,
          typesHeadline: responseObject.typesHeadline,
          relatedLabelLinks: responseObject.relatedLabelLinks,
          relatedLabelPressArticles: responseObject.relatedLabelPressArticles,
          memberAlumnus: responseObject.memberAlumnus,
          ariaTimezoneBoston: responseObject.ariaTimezoneBoston,
          ariaTimezoneBerlin: responseObject.ariaTimezoneBerlin,
          ariaProfilePicture: responseObject.ariaProfilePicture,
          ariaGeneralPicture: responseObject.ariaGeneralPicture,
          externalProject: responseObject.externalProject,
          externalEvent: responseObject.externalEvent,
          defaultMediation: responseObject.defaultMediation,
          defaultEventCategory: responseObject.defaultEventCategory,
          projectRSS: responseObject.projectRSS,
          eventRSS: responseObject.eventRSS,
          pagePublishedText: responseObject.PagePublishedText,
          pageEditedText: responseObject.PageEditedText,
          pagePublishedFormat: responseObject.PagePublishedFormat,
          siteEditedText: responseObject.SiteEditedText,
          siteEditedFormat: responseObject.SiteEditedFormat,
        },
        maxNumberFeaturedProjects: responseObject.maxNumberFeaturedProjects,
      },
      social: {
        twitter: responseObject.contact_twitter,
        github: responseObject.contact_github,
        email: responseObject.contact_email,
        vimeo: responseObject.contact_vimeo,
        youtube: responseObject.contact_youtube,
        soundcloud: responseObject.contact_soundcloud,
        facebook: responseObject.contact_facebook,
        linkedin: responseObject.contact_linkedin,
        instagram: responseObject.contact_instagram,
        mastodon: responseObject.contact_mastodon,
      },
    };

    console.log(responseObject.preview);

    if (
      responseObject.preview &&
      responseObject.preview.data?.attributes?.url
    ) {
      config.params.Images = [
        convertToPreviewImage(responseObject.preview.data?.attributes?.url),
      ];
      config.params.logo = convertToLogo(
        responseObject.preview.data?.attributes?.url,
      );
    }

    writeToJSON("config/config", config);

    // console.log({ responseObject });

    addIndexPage("berlin", responseObject.hostsHeadline);
    addIndexPage("harvard", responseObject.hostsHeadline);
  } catch (error) {
    console.error("Error during meta data fetching and processing:", error);
  }
};

fetchMetaData();
