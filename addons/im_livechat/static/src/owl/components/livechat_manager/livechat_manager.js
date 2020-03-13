odoo.define('im_livechat.component.LivechatManager', function (require) {
'use strict';

const LivechatButton = require('im_livechat.component.LivechatButton');

const ChatWindowManager = require('mail.component.ChatWindowManager');

var utils = require('web.utils');

const { Component } = owl;
const { useDispatch, useState } = owl.hooks;

class LivechatManager extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            history: {},
            result: {
                available_for_me: false,
                rule: {
                    action: 'popup',
                    auto_popup_timer: 0,
                    regex_url: '/im_livechat/',
                },
            },
        });
        this.storeDispatch = useDispatch();
    }
    /**
     * @override
     */
    async willStart() {
        var cookie = utils.get_cookie('im_livechat_session');
        if (!cookie) {
            this.rpc({
                route: '/im_livechat/init',
                params: {
                    channel_id: this.props.channel_id,
                },
            }).then(result => {
                Object.assign(this.state, { result });
            });
        } else {
            var channel = JSON.parse(cookie);
            this.rpc({
                route: '/mail/chat_history',
                params: {
                    uuid: channel.uuid,
                    limit: 100,
                },
            }).then(history => {
                Object.assign(this.state, { history });
            });
        }
        await this._loadQWebTemplate();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    async _loadQWebTemplate() {
        const templatesList = await this.rpc({
            route: '/im_livechat/load_templates',
        });
        const owlTemplates = [];
        templatesList.forEach(template => {
            const doc = new DOMParser().parseFromString(template, 'text/xml');
            for (let child of doc.querySelectorAll("templates > [owl]")) {
                child.removeAttribute('owl');
                owlTemplates.push(child.outerHTML);
                child.remove();
            }
        });
        this.env.qweb.addTemplates(`<templates> ${owlTemplates.join('\n')} </templates>`);
        // this.storeDispatch('joinChannel', 1);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onClick() {
        // TODO store dispatch
    }
}

Object.assign(LivechatManager, {
    components: { ChatWindowManager, LivechatButton },
    props: {
        default_username: String,
        header_background_color: String,
        button_background_color: String,
        title_color: String,
        button_text_color: String,
        button_text: String,
        input_placeholder: String,
        default_message: String,
        channel_name: String,
        channel_id: Number,
    },
    template: 'im_livechat.component.LivechatManager',
});

return LivechatManager;

});
