// ==UserScript==
// @name           main userscript
// @description    for test
// @version        1.0.0
// @namespace      https://greasyfork.org/en/users/713014-nanikit
// @exclude        *
// @match          http://unused-field.space/
// @author         nanikit
// @grant          GM_getValue
// @resource       @stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       library1         https://library1
// ==/UserScript==

import { createStitches } from "@stitches/react";

const stitch = createStitches({ theme: {} });
console.log(stitch);
