// ==UserScript==
// @name           main userscript
// @description    for test
// @version        {date_version}
// @namespace      https://greasyfork.org/en/users/713014-nanikit
// @exclude        *
// @match          http://unused-field.space/
// @author         nanikit
// @grant          GM_getValue
// @require        https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js
// @resource       @stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       react-dom        https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js
// @resource       react            https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       library1         file://library1.user.js
// ==/UserScript==

import "library1";
import React from "react";
import { render } from "./deps.ts";

// comment should be removed
render(<div />, document.body);
