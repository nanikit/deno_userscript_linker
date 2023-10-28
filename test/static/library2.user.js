// ==UserScript==
// @name           example library 2
// @description    for test 2
// @version        1.2.0
// @namespace      library namespace should not be merged.
// @exclude        http://*.net
// @match          http://unused-ield.space/
// @author         nanikit2
// @grant          GM_xmlhttpRequest
// @resource       link:fflate https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs
// ==/UserScript==

export * from "fflate";
console.log("lib 2");
