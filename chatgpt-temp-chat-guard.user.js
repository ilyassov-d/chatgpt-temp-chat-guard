// ==UserScript==
// @name         ChatGPT Temporary Chat Tab Protection
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Prevent accidental reload/closing of ChatGPT temporary chats
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let guardAttached = false;
    let lastUrl = location.href;

    function beforeUnloadHandler(event) {
        if (!isTemporaryChat()) return;

        event.preventDefault();

        event.returnValue = '';

        return '';
    }

    function isTemporaryChat() {
        const url = new URL(location.href);

        if (url.searchParams.get('temporary-chat') === 'true') {
            return true;
        }

        /*
         * Fallback:
         * ChatGPT may remove/change the query parameter after client-side
         * navigation while still showing the temporary-chat UI.
         *
         * Look for visible UI text associated with temporary chat.
         */
        const bodyText = document.body?.innerText || '';

        const hasTemporaryChatUI =
            /\btemporary chat\b/i.test(bodyText) ||
            /this chat won['’]t appear in history/i.test(bodyText);
        
        const isSavedConversation =
            /^\/c\/[^/]+/.test(url.pathname);

        return hasTemporaryChatUI && !isSavedConversation;
    }

    function attachGuard() {
        if (guardAttached) return;

        window.addEventListener('beforeunload', beforeUnloadHandler, {
            capture: true
        });

        guardAttached = true;

        console.log('[Temp Chat Guard] protection enabled');
    }

    function detachGuard() {
        if (!guardAttached) return;

        window.removeEventListener(
            'beforeunload',
            beforeUnloadHandler,
            { capture: true }
        );

        guardAttached = false;

        console.log('[Temp Chat Guard] protection disabled');
    }

    function updateGuard() {
        if (isTemporaryChat()) {
            attachGuard();
        } else {
            detachGuard();
        }
    }

    function handleUrlChange() {
        if (location.href === lastUrl) return;

        lastUrl = location.href;

        queueMicrotask(updateGuard);
        setTimeout(updateGuard, 100);
        setTimeout(updateGuard, 500);
    }

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        handleUrlChange();
        return result;
    };

    history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        handleUrlChange();
        return result;
    };

    window.addEventListener('popstate', handleUrlChange);

    function startObserver() {
        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        const observer = new MutationObserver(() => {
            handleUrlChange();
            updateGuard();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        updateGuard();
    }

    startObserver();

})();
