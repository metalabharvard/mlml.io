import Glide from "@glidejs/glide";

export function enableProjectGallery() {
  let el = document.getElementById("glide");
  if (el) {
    document.onreadystatechange = () => {
      if (
        document.readyState === "interactive" ||
        document.readyState === "complete"
      ) {
        var glide = new Glide(el).mount();

        const counter = document.getElementById("gallery-counter");
        const total = counter.dataset.total ?? 0;

        counter.textContent = `1 / ${total}`;

        glide.on("run.after", function () {
          counter.textContent = `${glide.index + 1} / ${total}`;
        });
      }
    };
  }
}

export function enableProjectHoverPreview() {
  const links = document.getElementsByClassName("preview-link hasImage");

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    const image = link.getElementsByClassName("preview-image")[0];

    const onMouseMove = (e) => {
      // image.style.left = `calc(max(60vw, ${e.pageX}px`;
      image.style.left = `${e.pageX}px`;
      image.style.top = e.pageY + "px";
    };

    link.addEventListener("mousemove", onMouseMove);
  }
}
