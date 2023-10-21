// ==UserScript==
// @name        example library 1
// @description for test 1
// @version     1.1.0
// @namespace   library namespace should not be merged.
// @exclude     http://asdf.net/
// @match       http://library.space/
// @author      nanikit1
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @resource    @stitches/react https://cdn.jsdelivr.net/npm/@stitches/react@1.2.8/dist/index.cjs
// @resource    fflate          https://cdn.jsdelivr.net/npm/fflate@0.7.4/lib/browser.cjs
// @resource    library2        http://localhost:8080/library2.user.js
// @resource    npm:react       https://cdn.jsdelivr.net/npm/react@18.2.0/cjs/react.production.min.js
// ==/UserScript==
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var library1_user_exports = {};
module.exports = __toCommonJS(library1_user_exports);
__reExport(library1_user_exports, require("@stitches/react"), module.exports);
console.log("lib 1");
