// ==UserScript==
// @name           main userscript
// @name:ko        메인 스크립트
// @description    for test
// @description:ko 테스트
// @version        230901010203
// @namespace      https://greasyfork.org/en/users/713014-nanikit
// @exclude        *
// @match          http://unused-field.space/
// @author         nanikit
// @grant          GM_getResourceText
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_xmlhttpRequest
// @require        https://cdn.jsdelivr.net/npm/requirejs@2.3.6/require.js
// @resource       link:@stitches/react https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource       link:fflate          https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs
// @resource       link:library1        file://library1.user.js
// @resource       link:library2        http://localhost:8080/library2.user.js
// @resource       link:npm:react       https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// @resource       link:npm:react-dom   https://cdn.jsdelivr.net/npm/react-dom@18.2.0/cjs/react-dom.production.min.js
// @resource       pure-resource        data:,pure%20resource
// ==/UserScript==
"use strict";

define("main", (require, exports, module) => {
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_library1 = require("library1");
var import_npm_react = __toESM(require("npm:react"));
var deps_exports = {};
__reExport(deps_exports, require("@stitches/react"));
__reExport(deps_exports, require("npm:react-dom"));
(0, deps_exports.render)( import_npm_react.default.createElement("div", null), document.body);

});

define("tampermonkey_grants", function() { Object.assign(this.window, { GM, GM_getResourceText, GM_getValue, GM_setValue, GM_xmlhttpRequest }); });
requirejs.config({ deps: ["tampermonkey_grants"] });
for (const { name, content } of GM.info.script.resources.filter(x => x.name.startsWith("link:"))) {
  define(name.replace("link:", ""), Function("require", "exports", "module", content));
}

require(["main"], () => {}, console.error);
