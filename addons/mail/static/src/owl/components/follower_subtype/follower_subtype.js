odoo.define('mail.component.FollowerSubtype', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch, useRef } = owl.hooks;

class FollowerSubtype extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const follower = state.followers[props.followerLocalId];
            const subtype = follower.subtypes[props.subtypeId];
            return {
                subtype
            };
        });
        // To get checkbox state.
        this._checkboxRef = useRef('checkbox');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on cancel button.
     *
     * @private
     * @param {Event} ev
     */
    _onChangeCheckbox(ev) {
        this.storeDispatch('setFollowerSubtypeCheck',
            this.props.followerLocalId,
            this.props.subtypeId,
            {
                checkValue: this._checkboxRef.el.checked,
            }
        );
    }
}

Object.assign(FollowerSubtype, {
    props: {
        subtypeId: Number,
        followerLocalId: String,
    },
    template: 'mail.component.FollowerSubtype',
});

return FollowerSubtype;

});
