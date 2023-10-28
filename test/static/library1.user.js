// ==UserScript==
// @name           example library 1
// @description    for test 1
// @version        1.1.0
// @namespace      library namespace should not be merged.
// @exclude        http://asdf.net/
// @match          http://library.space/
// @author         nanikit1
// @grant          GM_setValue
// @resource       link:@stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       link:npm:react        https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       link:library2         http://localhost:8080/library2.user.js
// @resource       pure-resource    data:,pure%20resource
// ==/UserScript==

export * from "@stitches/react";
console.log("lib 1");
