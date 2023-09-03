// ==UserScript==
// @name        main userscript
// @description for test
// @version     1.0.0
// @namespace   https://greasyfork.org/en/users/713014-nanikit
// @exclude     *
// @match       http://unused-field.space/
// @author      nanikit
// @grant       GM_getResourceText
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @require     https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js
// @resource    @stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource    fflate           https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs
// @resource    library1         {{library1}}
// @resource    library2         http://localhost:8080/library2.user.js
// @resource    react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// ==/UserScript==
// deno-fmt-ignore-file
// deno-lint-ignore-file
'use strict';

if (typeof define !== 'function') {
  throw new Error('requirejs not found.');
}

requirejs.config({
  enforceDefine: true,
});

define('main', (require, exports, module) => {
'use strict';

var react = require('@stitches/react');


const stitch = react.createStitches({ theme: {} });
console.log(stitch);

});

for (const name of ["@stitches/react","fflate","library1","library2","react"]) {
  const body = GM_getResourceText(name);
  define(name, Function('require', 'exports', 'module', body));
}

unsafeWindow.process = { env: { NODE_ENV: 'production' } };
require(['main'], () => {}, console.error);
