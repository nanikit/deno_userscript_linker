// ==UserScript==
// @name           main userscript
// @name:ko        메인 스크립트
// @description    for test
// @description:ko 테스트
// @version        {date_version}
// @namespace      https://greasyfork.org/en/users/713014-nanikit
// @exclude        *
// @match          http://unused-field.space/
// @author         nanikit
// @grant          GM_getValue
// @require        https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js
// @resource       link:@stitches/react  https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       link:npm:react-dom    https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js
// @resource       link:npm:react        https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       link:library1         file://library1.user.js
// ==/UserScript==

import "library1";
import React from "npm:react";
import { render } from "./deps.ts";

// comment should be removed
render(<div />, document.body);
