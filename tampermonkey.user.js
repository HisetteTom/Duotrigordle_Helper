// ==UserScript==
// @name         Duotrigordle Helper (Official Wordle Words)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Uses official Wordle word list with improved letter matching logic
// @author       HisetteTom
// @match        https://duotrigordle.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/utils/wordList.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/utils/boardParser.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/utils/wordMatcher.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/utils/observer.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/components/ui.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/components/boardDisplay.js
// @require      https://raw.githubusercontent.com/HisetteTom/Duotrigordle_Helper/main/src/main.js
// ==/UserScript==

(function() {
    'use strict';

    // Wait for all required modules to load
    function waitForModules(callback) {
        if (typeof DuotrigordleHelper !== 'undefined' &&
            typeof BoardObserver !== 'undefined' &&
            typeof createHelperPanel !== 'undefined' &&
            typeof displayBoard !== 'undefined' &&
            typeof wordMatchesWithCounts !== 'undefined' &&
            typeof rankBoards !== 'undefined' &&
            typeof initializeWordList !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForModules(callback), 100);
        }
    }

    // Initialize the application once all modules are loaded
    waitForModules(() => {
        const helper = new DuotrigordleHelper();
        helper.init();
    });
})();