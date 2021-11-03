import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { shuffle } from 'lodash';

export function animateLogo () {
	const pageLogo = document.getElementById('page-logo');

	const logoVariants = shuffle(['metaL&#1051B', 'metaLA&#1026', 'metaLAB', 'meta/AB', 'metaLA&#1026', 'meta&#1027A&#1026', 'metaL&#1237B', 'metaL&#1051B', 'metaL&#1236B', 'metaL&#1051B']);
	let currentLogoVariant = 0;
	let logoInterval;

	function changeLogo () {
	  currentLogoVariant += 1;
	  if (currentLogoVariant === logoVariants.length) {
	    currentLogoVariant = 0;
	    clearInterval(logoInterval);
	    logoInterval = setInterval(changeLogo, Math.random() * 15000);
	  }
	  pageLogo.innerHTML = logoVariants[currentLogoVariant]
	}

	if (pageLogo) {
	  logoInterval = setInterval(changeLogo, 100);
	}
}

export function enableSidebar () {
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
}