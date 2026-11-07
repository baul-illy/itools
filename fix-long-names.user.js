// ==UserScript==
// @name         Fix Long Names
// @author       baul
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Fixes long names such as Poisonous Crawler Exoskeleton
// @match        *://elgea.illyriad.co.uk/*
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/baul-illy/itools/raw/refs/heads/main/fix-long-names.user.js
// @downloadURL  https://github.com/baul-illy/itools/raw/refs/heads/main/fix-long-names.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (document.URL.includes('Trade/Orders') || document.URL.includes('Trade/HubOrders')) {
        const TARGET_TEXT = 'Poisonous Crawler Exoskeleton';
        const REPLACEMENT = 'Poisonous Crawler Exo';

        // imo this is ugly but (i think) the element is created via javascript so when tampermonkey
        // runs (even at document-end) it's a fraction of a sec before the element is built 
        const observer = new MutationObserver(() => {
            const els = document.querySelectorAll('a');
            for (const el of els) {
                for (const child of el.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE && child.nodeValue && child.nodeValue.includes(TARGET_TEXT)) {
                        child.nodeValue = child.nodeValue.replaceAll(TARGET_TEXT, REPLACEMENT);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

})();
