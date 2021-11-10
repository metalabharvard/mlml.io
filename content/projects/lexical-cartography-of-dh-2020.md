---
title: Lexical Cartography of DH2020
subtitle: ""
intro: A map to navigate scientific conferences through their speakers, arranged in a network visualization according to their lexical similarity.
start: "2020-03-01"
end: "2020-09-30"
datestring: March&ensp;–&ensp;September 2020
location: ""
host: harvard
mediation: web
category: project
isFeatured: false
externalLink: https://rodighiero.github.io/DH2020/
lastmod: "2021-11-10T12:47:55.082Z"
date: "2020-03-01"
slug: lexical-cartography-of-dh-2020
members:
    - label: Dario Rodighiero
      slug: dario-rodighiero
      twitter: dariorodighiero
cover:
    url: https://res.cloudinary.com/dfffh0gkl/image/upload/v1628686754/lexicalcarto_686c2c0761.jpg
    width: 3072
    height: 1920
    formats:
        large:
            url: https://res.cloudinary.com/dfffh0gkl/image/upload/v1628686756/large_lexicalcarto_686c2c0761.jpg
            ext: .jpg
            width: 1000
            height: 625
        medium:
            url: https://res.cloudinary.com/dfffh0gkl/image/upload/v1628686756/medium_lexicalcarto_686c2c0761.jpg
            ext: .jpg
            width: 750
            height: 469
        small:
            url: https://res.cloudinary.com/dfffh0gkl/image/upload/v1628686756/small_lexicalcarto_686c2c0761.jpg
            ext: .jpg
            width: 500
            height: 313
        thumbnail:
            url: https://res.cloudinary.com/dfffh0gkl/image/upload/v1628686755/thumbnail_lexicalcarto_686c2c0761.jpg
            ext: .jpg
            width: 245
            height: 153
members_twitter:
    - dariorodighiero

---
The moment public events went online, scholars felt the need for new instruments to orientate themselves in scientific conferences. The lexical cartography is a visual method that combines network visualization and Natural Language Processing (NLP) to create a map. Such a map display conference speakers according to their lexical similarity: the more two speakers are close in the space, the more their subject matters are related. Using a visual representation that recalls the cartographic imaginary, speakers are situated on a topographical terrain characterized by mountains, valleys, and wide plains.

The articles of the Digital Humanities Conference, which took place in Ottawa in July 2020, were grouped by authors and tokenized. Then, tokens were transformed in graph edges connecting couples of authors. Finally, the lexical network is drawn as a map making use of JavaScript and WebGL.

The Lexical Cartography of DH2020 has an interactive interface, whose information changes according to the zoom level. At first glance, when the map is just loaded, the viewer sees the most relevant keywords and cartographic peaks; these are the affordance to start browsing. By zooming on one area, content changes: keywords and elevations leave room to more detailed information specifically related to speakers. Clusters of collaborators take form as well as the keywords shared by a triplet of close speakers.

The lexical cartography is an open-source project that is aimed at exploring, from their texts, communities that count a maximum of a few thousand individuals. Visual analytics is no longer a way to study the dynamics of a community a posteriori, but rather a contemporary instrument at the disposal of the same community. If the citation analysis is a great method to study the evolution of scientific communities, the lexical cartography is the proper way to display ongoing events and foster connectivity.

[Link to GitHub repository](https://rodighiero.github.io/DH2020/)

For further information:<br> Moon, Chloe Ye-Eun, and Dario Rodighiero. 2020. “Mapping as a Contemporary Instrument for Orientation in Conferences.” In Atti Del IX Convegno Annuale AIUCD. La Svolta Inevitabile: Sfide e Prospettive per l’Informatica Umanistica. Quaderni Di Umanistica Digitale. Università Cattolica del Sacro Cuore. https://doi.org/10.5281/zenodo.3611341.