// ==UserScript==
// @name         Fix Long Names
// @author       baul
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Fixes long names such as Poisonous Crawler Exoskeleton
// @match        *://elgea.illyriad.co.uk/*
// @grant        none
// @run-at       document-start
// @updateURL    https://github.com/baul-illy/itools/raw/refs/heads/main/fix-long-names.user.js
// @downloadURL  https://github.com/baul-illy/itools/raw/refs/heads/main/fix-long-names.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (document.URL.includes("Trade/Orders") || document.URL.includes("Trade/HubOrders")) {
        const TARGET_TEXT = 'Poisonous Crawler Exoskeleton';
        const REPLACEMENT = 'Poisonous Crawler Exo';

        function replaceInElement(el) {
            for (const child of el.childNodes) {
                if (child.nodeType === Node.TEXT_NODE && child.nodeValue && child.nodeValue.includes(TARGET_TEXT)) {
                    child.nodeValue = child.nodeValue.replaceAll(TARGET_TEXT, REPLACEMENT);
                }
            }
        }

        function scanPage(root = document) {
            const links = root.querySelectorAll('a');
            for (const link of links) {
                replaceInElement(link);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => scanPage());
        } else {
            scanPage();
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'A') {
                            replaceInElement(node);
                        } else {
                            scanPage(node);
                        }
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
