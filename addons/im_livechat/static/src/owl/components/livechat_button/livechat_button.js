odoo.define('im_livechat.component.LivechatButton', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const { Component } = owl;
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
