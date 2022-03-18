import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
// import { shuffle } from 'lodash';

// export function animateLogo () {
// 	const pageLogo = document.getElementById('page-logo');

// 	const logoVariants = shuffle(['metaL&#1051B', 'metaLA&#1026', 'metaLAB', 'meta/AB', 'metaLA&#1026', 'meta&#1027A&#1026', 'metaL&#1237B', 'metaL&#1051B', 'metaL&#1236B', 'metaL&#1051B']);
// 	let currentLogoVariant = 0;
// 	let logoInterval;

// 	function changeLogo () {
// 	  currentLogoVariant += 1;
// 	  if (currentLogoVariant === logoVariants.length) {
// 	    currentLogoVariant = 0;
// 	    clearInterval(logoInterval);
// 	    logoInterval = setInterval(changeLogo, Math.random() * 15000);
// 	  }
// 	  pageLogo.innerHTML = logoVariants[currentLogoVariant]
// 	}

// 	if (pageLogo) {
// 	  logoInterval = setInterval(changeLogo, 100);
// 	}
// }

const ALTERNATIVES = [
	['a', ['a', 'ā', 'ɐ', '', '', '', '']],
	['b', ['b', 'ƀ', 'ƃ', 'ḇ', 'ḅ', 'ɓ', '฿', '', 'в', 'ƅ']],
	['c', ['c', 'ɕ', 'ȼ', 'ċ', 'ͽ', '₡']],
	['d', ['d', 'đ', 'ɖ', 'ɗ', 'ƌ', 'ȡ', 'ḏ']],
	['e', ['e', 'ë', 'ɇ', 'ē', 'ė', 'ǝ', 'ᵉ', '℮', 'ɚ', '϶', 'ҽ', 'ₔ']],
	['f', ['f', 'ẝ', 'ғ', 'ʄ', 'ẜ', 'ḟ', '₣']],
	['g', ['g', 'ɠ', 'ǥ', 'ġ', 'ḡ', 'ɢ', 'ʛ']],
	['h', ['h', 'ɧ', 'ḥ', 'ẖ', 'ḧ', 'ʯ']],
	['i', ['i', 'ï', 'ı', 'ȉ', '', 'ị', 'ї', '⁚']],
	['j', ['j', '', 'ʝ', 'ʲ']],
	['k', ['k', 'ʞ', 'ƙ', 'ḵ']],
	['l', ['l', 'ɭ', 'ɬ', 'ḻ', '', 'ӏ', 'Ŀ']],
	['m', ['m', 'ꟿ', 'ϻ', 'ɱ', 'ṃ', 'ϻ']],
	['n', ['n', 'n', 'ɳ', 'ƞ', 'ṉ', 'ₙ', 'П', 'ϗ']],
	['o', ['o', 'Ѻ', 'Ϙ', '○', '¤', 'ȯ', 'ō', 'ø', 'ʘ']],
	['p', ['p', '₱', 'ρ', '℗']],
	['q', ['q', 'ɋ', 'Ϙ', 'ϙ']],
	['r', ['r', '', 'ṟ', 'ɼ', '®']],
	['s', ['s', 'ƨ', 'ṩ']],
	['t', ['t', 'T', 'ȶ', 'ẗ', 'т']],
	['u', ['u', 'ů', 'υ']],
	['v', ['v', 'ʌ', 'ṿ']],
	['w', ['w', 'ẘ', 'ш', 'ώ']],
	['x', ['x', 'χ', '×', 'Ӿ']],
	['y', ['y', 'y', 'ƴ', 'Ỿ']],
	['z', ['z', 'ɀ', 'ʑ']]
];

class TextAnimation {
	originalText;
	originalLength;
	target;
	count;
	interval;
	direction = 'DISAPPEAR';
	format = 'ORIGINAL';
	alternativeText;
  constructor (target) {
  	const el = target.getElementsByTagName('span')[0];
  	const text = el.textContent;
  	const length = text.length;
  	this.target = el;
  	this.originalText = text;
  	this.originalLength = length;
    this.count = length;
    target.addEventListener('mouseenter', () => {
    	this.generateText();
    	this.animate('ALTERNATIVE');
    });
    target.addEventListener('mouseleave', () => { this.animate('ORIGINAL'); });
  }
  animate (format) {
  	this.stopAnimation();
  	this.direction = format !== this.format ? 'DISAPPEAR' : 'APPEAR';
  	this.interval = setInterval(() => {
  		if (this.direction === 'DISAPPEAR') {
  			this.count -= 1;
  			if (this.count <= 1) {
  				this.direction = 'APPEAR';
  				this.format = format;
  			}
  		} else {
  			this.count += 1;
  			if (this.count >= this.originalLength) {
  				this.stopAnimation();
  			}
  		}
  		this.setText();
  	}, 20)
  }
  generateText () {
  	let text = this.originalText;
  	ALTERNATIVES.forEach(([match, alt]) => {
  		const sub = alt[Math.floor(Math.random() * alt.length)];
  		text = text.replace(new RegExp(`[${match}]`,"gi"), () => alt[Math.floor(Math.random() * alt.length)]);
  	})
  	this.alternativeText = text
  }
  getText () {
  	const text = this.format === 'ALTERNATIVE' ? this.alternativeText : this.originalText;
  	return text.slice(0, Math.min(Math.max(this.count, 0), this.originalLength));
  }
  setText () {
  	this.target.innerText = this.getText() || ' ';
  }
  stopAnimation () {
  	clearInterval(this.interval);
  }
}

export function animateMenu () {
	const elements = document.getElementsByClassName('text-animate');
	for (let i = 0; i < elements.length; i++) {
		new TextAnimation(elements[i])
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