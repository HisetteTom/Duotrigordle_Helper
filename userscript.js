// ==UserScript==
// @name         Duotrigordle Helper (Official Wordle Words)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Uses official Wordle word list with improved letter matching logic
// @match        https://duotrigordle.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Import the main application
import { DuotrigordleHelper } from './src/main.js';