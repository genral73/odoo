odoo.define('mail.component.FollowerSubtypesEditDialog', function (require) {
'use strict';

const FollowerSubtype = require('mail.component.FollowerSubtype');
const useStore = require('mail.hooks.useStore');

const Dialog = require('web.OwlDialog');

const { Component, QWeb } = owl;
const { useDispatch, useRef } = owl.hooks;

class FollowerSubtypesEditDialog extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const follower = state.followers[props.info.followerLocalId];
            const subtypes = Object.values(follower.subtypes);
            return {
                follower,
                subtypes,
            };
        });
        // to manually trigger the dialog close event
        this._dialogRef = useRef('dialog');
    }

    /**
     * Mandatory method for dialog components.
     * @return {boolean}
     */
    isCloseable() {
        return true;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on cancel button.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCancel(ev) {
        this._dialogRef.comp._close();
    }

    /**
     * Called when clicking on apply button.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickApply(ev) {
        this._dialogRef.comp._close();
        this.storeDispatch('updateFollowerSubtypes', this.props.info.followerLocalId);
    }

    /**
     * Called when clicking on cross button.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onDialogClosed(ev) {
        this.storeDispatch('closeDialog', this.props.id);
    }
}

Object.assign(FollowerSubtypesEditDialog, {
    components: { Dialog, FollowerSubtype },
    props: {
        id: String,
        info: {
            type: Object,
            shape: {
                followerLocalId: String,
            },
        },
    },
    template: 'mail.component.FollowerSubtypesEditDialog',
});

QWeb.registerComponent('FollowerSubtypesEditDialog', FollowerSubtypesEditDialog);

return FollowerSubtypesEditDialog;

});
