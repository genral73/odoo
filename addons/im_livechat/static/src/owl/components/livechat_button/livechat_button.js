odoo.define('im_livechat.component.LivechatButton', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const { Component, utils } = owl;
const { useDispatch } = owl.hooks;

class LivechatButton extends Component {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            return {
                publicLivechat: state.publicLivechat,
            };
        });
    }
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {string}
     */
    getButtonStyle() {
        const styles = {};
        if (this.storeProps.publicLivechat.button_background_color) {
            styles['background-color'] = this.storeProps.publicLivechat.button_background_color;
        }
        if (this.storeProps.publicLivechat.button_text_color) {
            styles['color'] = this.storeProps.publicLivechat.button_text_color;
        }
        return Object.keys(styles).reduce((res, property) => {
            return res + _.str.sprintf("%s: %s;",
                property,
                utils.escape(styles[property])
            );
        }, '');
    }
    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClick() {
        this.storeDispatch('openPublicLivechat');
    }
}

Object.assign(LivechatButton, {
    props: {
    },
    template: 'im_livechat.component.LivechatButton',
});

return LivechatButton;

});
