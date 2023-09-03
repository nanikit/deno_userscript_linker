// ==UserScript==
// @name           example library 1
// @description    for test 1
// @version        1.1.0
// @namespace      library namespace should not be merged.
// @exclude        http://asdf.net/
// @match          http://library.space/
// @author         nanikit1
// @grant          GM_setValue
// @resource       @stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       library2         file://library2
// ==/UserScript==

console.log("lib 1");
