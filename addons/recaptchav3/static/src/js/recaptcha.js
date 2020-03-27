odoo.define('reCaptchaV3Mixin', function (require) {
"use strict";

/**
 * The ReCaptchaV3Mixin is a mixin, designed to add the google reCaptchaV3
 */
return {
    /**
     * @override
     */
    start: function () {
        if (odoo.reCaptchaPublicKey) {
            const url = `https://www.recaptcha.net/recaptcha/api.js?render=${odoo.reCaptchaPublicKey}`;
            let script = document.head.querySelector(`script[src="${url}"]`);
            if (!script) {
                script = document.createElement("script");
                script.src = url;
                script.async = false;
                document.head.appendChild(script);
            }
            this.scriptLoad = new Promise((resolve) => {
                script.addEventListener('load', () => {
                    window.grecaptcha.ready(() => resolve());
                });
            });
        }
    },

    //----------------------------------------------------------------------
    // Private
    //----------------------------------------------------------------------

    /**
     *
     * @param {string} action
     * @returns {Promise}
     */
    _getReCaptchaV3Token: async function (action) {
        if (!odoo.reCaptchaPublicKey) {
            return false;
        }
        await this.scriptLoad;
        return window.grecaptcha.execute(odoo.reCaptchaPublicKey, {action: action});
    },
};
});
