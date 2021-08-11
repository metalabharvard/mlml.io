import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { render } from 'timeago.js';
import chroma from "chroma-js";
import tippy from 'tippy.js';

const tags = document.getElementsByClassName('project-tag');

const scale = chroma.scale(['#FFB600', '#FF4800']);

for (let i = 0; i < tags.length; i++) {
  const tag = tags[i];
  const oldContent = tag.textContent
  const amountOfCharacters = oldContent.length;
  let newContent = '';
  for (let c = 0; c < amountOfCharacters; c++) {
  	const percentage = 1 / (amountOfCharacters - 1) * c;
  	newContent += `<span style="color: ${scale(percentage).hex()}">${oldContent[c]}</span>`
  }
  tag.innerHTML = newContent;
}

const template = document.getElementById('start-time-template');

if (template) {
  tippy('.event-time', {
    content: template.innerHTML,
    allowHTML: true
  });
}


const nodes = document.querySelectorAll('.timeago');
if (nodes.length) {
  render(nodes);
}

let isOpen = false;
const trigger = document.getElementById('page-menu-trigger');
// const backdrop = document.getElementById('homepage-sidebar-backdrop');
const container = document.getElementById('page-menu');
const sidebar = document.getElementById('page-menu-list');

trigger.setAttribute('title', 'Click to open navigation sidebar');
trigger.removeAttribute('aria-disabled');

function toggleSidebar () {
  if (isOpen) {
    isOpen = false
    sidebar.classList.remove('isOpen');
    trigger.setAttribute('aria-pressed', false);
    container.setAttribute('aria-hidden', true);
    trigger.setAttribute('title', 'Click to open navigation sidebar');
    enableBodyScroll(sidebar)
  } else {
    isOpen = true
    sidebar.classList.add('isOpen');
    trigger.setAttribute('aria-pressed', true);
    container.setAttribute('aria-hidden', false);
    trigger.setAttribute('title', 'Click to close navigation sidebar');
    disableBodyScroll(sidebar)
  }
}

trigger.addEventListener('click', toggleSidebar);
trigger.addEventListener('keydown', ({ key }) => {
  if (key === ' ' || key === 'Enter' || key === 'Spacebar') {
    toggleSidebar();
  }
});
// backdrop.addEventListener('click', toggleSidebar);

document.addEventListener('keydown', ({ key }) => {
  if (key === 'Escape' && isOpen) {
    toggleSidebar();
  }
});

const eventTags = document.getElementsByClassName('event-tag');

for (let i = 0; i < eventTags.length; i++) {
  const tag = eventTags[i];
  const eventDate = new Date(tag.getAttribute('datetime'))
  if (eventDate > new Date()) {
    tag.textContent = 'Upcoming';
  }
}
