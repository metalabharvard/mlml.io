export function shuffleFeatures() {
  var ul = document.getElementById("home-features-list");
  if (ul && ul.children.length > 0) {
    for (var i = ul.children.length; i >= ul.children.length / 2; i--) {
      ul.appendChild(ul.children[(Math.random() * i) | 0]);
    }

    let elementsToDisplay = parseInt(ul.dataset.count ?? 5) + 1;

    for (var i = ul.children.length - elementsToDisplay; i >= 0; i--) {
      ul.children[i].remove();
    }

    ul.style.opacity = 1;
  }
}
