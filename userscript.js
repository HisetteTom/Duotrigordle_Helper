// ==UserScript==
// @name         Duotrigordle Helper (Official Wordle Words)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Uses official Wordle word list with improved letter matching logic
// @author       HisetteTom
// @match        https://duotrigordle.com/*
// @grant        GM_xmlhttpRequest
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

    // Logging system setup
    const logger = {
        moduleLoaded: (moduleName) => {
            console.log(`✅ [${new Date().toISOString()}] Successfully loaded module: ${moduleName}`);
        },
        moduleError: (moduleName, error) => {
            console.error(`❌ [${new Date().toISOString()}] Error loading module: ${moduleName}`);
            console.error(`Error details:`, error);
        },
        init: (message) => {
            console.log(`🚀 [${new Date().toISOString()}] ${message}`);
        },
        error: (message, error) => {
            console.error(`💥 [${new Date().toISOString()}] ${message}`, error);
        }
    };

    // Module verification
    const verifyModules = () => {
        const requiredModules = [
            { name: 'wordList', obj: typeof wordList !== 'undefined' },
            { name: 'boardParser', obj: typeof boardParser !== 'undefined' },
            { name: 'wordMatcher', obj: typeof wordMatcher !== 'undefined' },
            { name: 'observer', obj: typeof observer !== 'undefined' },
            { name: 'ui', obj: typeof ui !== 'undefined' },
            { name: 'boardDisplay', obj: typeof boardDisplay !== 'undefined' },
            { name: 'DuotrigordleHelper', obj: typeof DuotrigordleHelper !== 'undefined' }
        ];

        let allLoaded = true;
        requiredModules.forEach(module => {
            if (module.obj) {
                logger.moduleLoaded(module.name);
            } else {
                logger.moduleError(module.name, 'Module not found in global scope');
                allLoaded = false;
            }
        });
        return allLoaded;
    };

    // Main initialization
    const init = () => {
        logger.init('Starting Duotrigordle Helper initialization');
        
        try {
            // Verify all modules are loaded
            if (!verifyModules()) {
                throw new Error('Not all required modules were loaded successfully');
            }

            // Initialize the helper
            logger.init('All modules loaded, initializing DuotrigordleHelper');
            const helper = new DuotrigordleHelper();
            helper.init();
            logger.init('DuotrigordleHelper initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize DuotrigordleHelper', error);
            // Display error to user
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff5555; color: white; padding: 10px; border-radius: 5px; z-index: 9999;';
            errorDiv.textContent = `Helper failed to load: ${error.message}. Check console for details.`;
            document.body.appendChild(errorDiv);
        }
    };

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();