import { renderTimeAgoTags, enableEventTabs } from "./event.js";
import { enableSidebar, animateMenu } from "./header.js";
import { enableProjectGallery, enableProjectHoverPreview } from "./project.js";
import { shuffleFeatures } from "./features.js";

shuffleFeatures();
renderTimeAgoTags();
enableEventTabs();
// animateLogo();
enableProjectGallery();
enableProjectHoverPreview();
enableSidebar();
animateMenu();
