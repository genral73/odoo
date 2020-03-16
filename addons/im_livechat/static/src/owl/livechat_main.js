odoo.define('im_livechat.main', function (require) {

const LivechatManager = require('im_livechat.component.LivechatManager');

const { getMessagingEnv } = require('mail.messaging.env');

const publicEnv = require('web.public_env');
var utils = require('web.utils');

const messagingEnv = getMessagingEnv('main', publicEnv);
messagingEnv.rpc = publicEnv.services.rpc;
messagingEnv.hasAttachments = false;
messagingEnv.hasEmojis = false;
messagingEnv.hasFontAwesome = false;

Object.assign(messagingEnv.store.actions, {
    /**
     * Initiates the public livechat by fetching the chat history (if it exists)
     * or the channel info otherwise.
     *
     * @param {Object} param0
     * @param {function} param0.dispatch
     * @param {Object} param0.env
     * @param {Object} param0.state
     * @param {Object} param1
     */
    async initPublicLivechat({ dispatch, env, state }, {
        button_background_color,
        button_text,
        button_text_color,
        channel_id,
        channel_name,
        default_message,
        header_background_color,
        input_placeholder,
        title_color,
    }) {
        var operatorCookie = utils.get_cookie('im_livechat_previous_operator_pid');
        const previousOperatorLocalId = operatorCookie
            ? dispatch('_insertPartner', { id: operatorCookie })
            : undefined;

        state.publicLivechat = {
            button_background_color,
            button_text,
            button_text_color,
            channel_id,
            channel_name,
            default_message,
            default_username: env._t("Visitor"),
            header_background_color,
            history: {},
            input_placeholder,
            previousOperatorLocalId,
            result: {
                available_for_me: false,
                rule: {
                    action: 'popup',
                    auto_popup_timer: 0,
                    regex_url: '/im_livechat/',
                },
            },
            title_color,
        };
        var sessionCookie = utils.get_cookie('im_livechat_session');
        if (!sessionCookie) {
            const result = await env.rpc({
                route: '/im_livechat/init',
                params: {
                    channel_id: channel_id,
                },
            });
            Object.assign(state.publicLivechat, { result });
        } else {
            var channel = JSON.parse(sessionCookie);
            const history = await env.rpc({
                route: '/mail/chat_history',
                params: {
                    uuid: channel.uuid,
                    limit: 100,
                },
            });
            Object.assign(state.publicLivechat, { history });
        }
    },
    async openPublicLivechat({ dispatch, env, state }) {
        const livechatData = await env.rpc({
            route: '/im_livechat/get_session',
            params: {
                channel_id: state.publicLivechat.channel_id,
                anonymous_name: state.publicLivechat.default_username,
                previous_operator_id: state.partners[state.publicLivechat.previousOperatorLocalId].id,
            },
            settings: {
                shadow: true,
            },
        });
        const threadLocalId = dispatch('insertThread', Object.assign({
            _model: 'mail.channel',
        }, livechatData));
        dispatch('openThread', threadLocalId);
    },
    /**
     * Messages are fetched through "history" for livechat.
     *
     * @override
     */
    async _loadMessagesOnThread(
        { dispatch, env, state },
        threadLocalId,
        param2,
    ) {
        dispatch('_handleThreadLoaded', threadLocalId, {
            messagesData: [],
        });
    },
    /**
     * There is no server sync for livechat.
     *
     * @override
     */
    async _notifyServerThreadIsMinimized({ env, state }, threadLocalId) {},
        /**
     * There is no server sync for livechat.
     *
     * @override
     */
    async _notifyServerThreadState({ env, state }, threadLocalId) {},
});

async function init(url, options) {
    // load qweb templates
    const templatesProm = messagingEnv.rpc({
        route: '/im_livechat/load_templates',
    }).then(templatesList => {
        const owlTemplates = [];
        templatesList.forEach(template => {
            const doc = new DOMParser().parseFromString(template, 'text/xml');
            for (let child of doc.querySelectorAll("templates > [owl]")) {
                child.removeAttribute('owl');
                owlTemplates.push(child.outerHTML);
                child.remove();
            }
        });
        messagingEnv.qweb.addTemplates(`<templates> ${owlTemplates.join('\n')} </templates>`);
    });

    // init state
    const initProm = messagingEnv.store.dispatch('initPublicLivechat', options);

    // when everything is ready: mount component
    await Promise.all([templatesProm, initProm]);
    LivechatManager.env = messagingEnv;
    const livechatManager = new LivechatManager(null, options);
    livechatManager.mount(document.body);

    var rootWidget = require('root.widget');
    var im_livechat = require('im_livechat.im_livechat');
    var button = new im_livechat.LivechatButton(rootWidget, url, options);
    button.appendTo(document.body);
}

return { init };

});
