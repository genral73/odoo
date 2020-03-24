odoo.define('web.web_client', function (require) {
    "use strict";

    const env = require('web.env');
    const session = require("web.session");
    const WebClient = require('web.WebClientClass');

    owl.config.mode = env.isDebug() ? "dev" : "prod";
    owl.Component.env = env;

    const webClient = new WebClient();

    /**
     * Add the owl templates to the environment and start the web client.
     */
    async function startWebClient() {
        await session.is_bound;
        env.qweb.addTemplates(session.owlTemplates);

        await owl.utils.whenReady();
        webClient.mount(document.body, { position: 'self' });
    }

    startWebClient();

    return webClient;
});
