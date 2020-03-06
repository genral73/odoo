odoo.define('mail.component.FollowerSubtypesEditDialog', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const Dialog = require('web.OwlDialog');

const { Component } = owl;
const { useDispatch, useRef } = owl.hooks;

class FollowerSubtypesEditDialog extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const follower = state.followers[props.followerLocalId];
            return {
                follower
            };
        }, {
            compareDepth: {
                messages: 1,
            },
        });
        // to manually trigger the dialog close event
        this._dialogRef = useRef('dialog');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClickCancel() {
        console.log('cancel');
        this._dialogRef.comp._close();
    }
    /**
     * @private
     */
    _onClickApply() {
        console.log('apply');
        this._dialogRef.comp._close();
        // this.storeDispatch('updateSubtypes',
        //     this.storeProps.messages.map(message => message.localId),
        //     'discard'
        // );
    }
}

Object.assign(FollowerSubtypesEditDialog, {
    components: { Dialog },
    props: {
        followerLocalId: String,
    },
    template: 'mail.component.FollowerSubtypesEditDialog',
});

return FollowerSubtypesEditDialog;

});
