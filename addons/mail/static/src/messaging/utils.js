odoo.define('mail.messaging.utils', function (require) {
'use strict';

const {
    patch: webUtilsPatch,
    unpatch: webUtilsUnpatch,
} = require('web.utils');

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

const classPatchMap = new WeakMap();

/**
 * Inspired by web.utils:patch utility function
 *
 * @param {Class} Class
 * @param {string} patchName
 * @param {Object} patch
 * @returns {function} unpatch function
 */
function patchClassMethods(Class, patchName, patch) {
    let metadata = classPatchMap.get(Class);
    if (!metadata) {
        metadata = {
            origMethods: {},
            patches: {},
            current: []
        };
        classPatchMap.set(Class, metadata);
    }
    if (metadata.patches[patchName]) {
        throw new Error(`Patch [${patchName}] already exists`);
    }
    metadata.patches[patchName] = patch;
    applyPatch(Class, patch);
    metadata.current.push(patchName);

    function applyPatch(Class, patch) {
        Object.keys(patch).forEach(function (methodName) {
            const method = patch[methodName];
            if (typeof method === "function") {
                const original = Class[methodName];
                if (!(methodName in metadata.origMethods)) {
                    metadata.origMethods[methodName] = original;
                }
                Class[methodName] = function (...args) {
                    const previousSuper = this._super;
                    this._super = original;
                    const res = method.call(this, ...args);
                    this._super = previousSuper;
                    return res;
                };
            }
        });
    }

    return () => unpatchClassMethods.bind(Class, patchName);
}

/**
 * @param {Class} Class
 * @param {string} patchName
 * @param {Object} patch
 * @returns {function} unpatch function
 */
function patchInstanceMethods(Class, patchName, patch) {
    return webUtilsPatch(Class, patchName, patch);
}

/**
 * Inspired by web.utils:unpatch utility function
 *
 * @param {Class} Class
 * @param {string} patchName
 */
function unpatchClassMethods(Class, patchName) {
    let metadata = classPatchMap.get(Class);
    if (!metadata) {
        return;
    }
    classPatchMap.delete(Class);

    // reset to original
    for (let k in metadata.origMethods) {
        Class[k] = metadata.origMethods[k];
    }

    // apply other patches
    for (let name of metadata.current) {
        if (name !== patchName) {
            patchClassMethods(Class, name, metadata.patches[name]);
        }
    }
}

/**
 * @param {Class} Class
 * @param {string} patchName
 */
function unpatchInstanceMethods(Class, patchName) {
    return webUtilsUnpatch(Class, patchName);
}

//------------------------------------------------------------------------------
// Export
//------------------------------------------------------------------------------

return {
    patchClassMethods,
    patchInstanceMethods,
    unpatchClassMethods,
    unpatchInstanceMethods,
};

});
