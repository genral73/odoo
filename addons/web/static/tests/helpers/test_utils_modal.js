odoo.define('web.test_utils_modal', function (require) {
"use strict";

/**
 * Modal Test Utils
 *
 * This module defines various utility functions to help test pivot views.
 *
 * Note that all methods defined in this module are exported in the main
 * testUtils file.
 */

const core = require('web.core');
const domUtils = require('web.test_utils_dom');

/**
 * Click on a button in the footer of a modal (which contains a given string).
 * Note that this method checks the unicity of the button.
 *
 * @param {string} text (in english: this method will perform the translation)
 */
function clickButton(text) {
    const selector = `.modal-footer button:contains(${core._t(text)})`;
    const $button = $(selector);
    if ($button.length !== 1) {
        throw new Error(`Found ${$button.length} button(s) containing '${text}'`);
    }
    return domUtils.click($button);
}

return {
    clickButton: clickButton,
};

});
