import Siema from 'siema';

export function enableProjectGallery () {
	const element = document.getElementById('siema-carousel');

	if (element !== null) {
	  // const buttons = document.getElementsByClassName('btnGoTo');
	  const btnPrev = document.getElementById('btnPrev');
	  const btnNext = document.getElementById('btnNext');
	  const counter = document.getElementById('counter');

	  // let left = 0;
	  // let top = 0;

	  const numberOfButtons = element.getAttribute('data-amount');

	  const mySiema = new Siema({
	    selector: element,
	    loop: true,
	    onInit: () => { refreshInterface(true) },
	    onChange: () => { refreshInterface() }
	  });

	  function refreshInterface (isInit) {
	    currentSlide = isInit ? 0 : mySiema.currentSlide
	    // for (let l = 0; l < numberOfButtons; l++) {
	    //  if (currentSlide === l) {
	    //    buttons[l].classList.add('isActive');
	    //    buttons[l].disabled = true;
	    //  } else {
	    //    buttons[l].classList.remove('isActive');
	    //    buttons[l].disabled = false;
	    //  }
	    // }

	    btnPrev.disabled = currentSlide === 0
	    btnNext.disabled = currentSlide === numberOfButtons - 1

	    counter.textContent = `${currentSlide + 1} / ${numberOfButtons}`

	    btnPrev.blur();
	    btnNext.blur();
	  }

	  document.addEventListener('keydown', (e) => {
	    if (e.keyCode === 37) {
	      mySiema.prev();
	    }
	    else if (e.keyCode === 39) {
	      mySiema.next();
	    }
	  })

	  btnPrev.addEventListener('click', () => mySiema.prev());
	  btnNext.addEventListener('click', () => mySiema.next());

	  // for (let l = 0; l < numberOfButtons; l++) {
	  //  buttons[l].addEventListener('click', (e) => {
	  //    const id = buttons[l].getAttribute('data-index')
	  //    mySiema.goTo(id)
	  //  })
	  // }

	  // window.addEventListener('resize', refreshPosition);
	  // refreshPosition();

	  document.addEventListener('mousemove', (e) => {
	    counter.style.left = e.pageX + 4 + 'px';
	    counter.style.top = e.pageY + 4 + 'px';
	  });

	  // function refreshPosition () {
	  //  const rect = element.getBoundingClientRect();
	  //  left = rect.left;
	  //  top = rect.top;
	  // }
	}
}

export function enableProjectHoverPreview () {
	const links = document.getElementsByClassName('preview-link hasImage');

	for (let i = 0; i < links.length; i++) {
	  const link = links[i];

	  const image = link.getElementsByClassName('preview-image')[0]
	  
	  const onMouseMove = (e) =>{
	    // image.style.left = `calc(max(60vw, ${e.pageX}px`;
	    image.style.left = `${e.pageX}px`;
	    image.style.top = e.pageY + 'px';
	  }

	  link.addEventListener('mousemove', onMouseMove);
	}
}