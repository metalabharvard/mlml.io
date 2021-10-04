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

window.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('[role="tab"]');
  const tabList = document.querySelector('[role="tablist"]');

  if (tabs.length && tabList) {
    // Add a click event handler to each tab
    tabs.forEach(tab => {
      tab.addEventListener('click', changeTabs);
    });

    // Enable arrow navigation between tabs in the tab list
    let tabFocus = 0;

    tabList.addEventListener('keydown', e => {
      // Move right
      if (e.keyCode === 39 || e.keyCode === 37) {
        tabs[tabFocus].setAttribute('tabindex', -1);
        if (e.keyCode === 39) {
          tabFocus++;
          // If we're at the end, go to the start
          if (tabFocus >= tabs.length) {
            tabFocus = 0;
          }
          // Move left
        } else if (e.keyCode === 37) {
          tabFocus--;
          // If we're at the start, move to the end
          if (tabFocus < 0) {
            tabFocus = tabs.length - 1;
          }
        }

        tabs[tabFocus].setAttribute('tabindex', 0);
        tabs[tabFocus].focus();
      }
    });
  }
});

function changeTabs(e) {
  const target = e.target;
  const parent = target.parentNode;
  const grandparent = parent.parentNode;

  // Remove all current selected tabs
  parent
    .querySelectorAll('[aria-selected="true"]')
    .forEach(t => t.setAttribute('aria-selected', false));

  // Set this tab as selected
  target.setAttribute('aria-selected', true);

  // Hide all tab panels
  grandparent
    .querySelectorAll('[role="tabpanel"]')
    .forEach(p => p.setAttribute('hidden', true));

  // Show the selected panel
  grandparent.parentNode
    .querySelector(`#${target.getAttribute('aria-controls')}`)
    .removeAttribute('hidden');
}

const pageLogo = document.getElementById('page-logo');

const logoVariants = ['metaL&#1051B', 'metaLA&#1026', 'metaLAB', 'meta/AB', 'metaLA&#1026', 'meta&#1027A&#1026', 'metaL&#1237B', 'metaL&#1051B', 'metaL&#1236B', 'metaL&#1051B'];
let currentLogoVariant = 0;
let logoInterval;

function changeLogo () {
  currentLogoVariant += 1;
  if (currentLogoVariant === logoVariants.length) {
    currentLogoVariant = 0;
    clearInterval(logoInterval);
  }
  pageLogo.innerHTML = logoVariants[currentLogoVariant]
}

if (pageLogo) {
  logoInterval = setInterval(changeLogo, 100);
}