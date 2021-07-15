import chroma from "chroma-js";

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