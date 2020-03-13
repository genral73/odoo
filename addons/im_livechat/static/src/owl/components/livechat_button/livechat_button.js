odoo.define('im_livechat.component.LivechatButton', function (require) {
'use strict';

const { Component } = owl;

class LivechatButton extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onClick() {
        // TODO store dispatch
    }
}

Object.assign(LivechatButton, {
    props: {
    },
    template: 'im_livechat.component.LivechatButton',
});

return LivechatButton;

});
