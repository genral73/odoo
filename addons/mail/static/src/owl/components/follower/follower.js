odoo.define('mail.component.Follower', function (require) {
'use strict';

const FollowerSubtypesEditDialog = require('mail.component.FollowerSubtypesEditDialog');
const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch } = owl.hooks;

class Follower extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const follower = state.followers[props.followerLocalId];
            return {
                follower
            };
        });
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * @returns {integer}
     */
    get resId() {
        return this.storeProps.follower.partnerId
            ? this.storeProps.follower.partnerId
            : this.storeProps.follower.channelId;
    }

    /**
     * @returns {string}
     */
    get resModel() {
        return this.storeProps.follower.partnerId
            ? 'res.partner'
            : 'mail.channel';
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickDetails(ev) {
        this.storeDispatch('redirect', {
            id: this.resId,
            model: this.resModel,
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickEdit(ev) {
        ev.preventDefault();
        this.storeDispatch('showFollowerSubtypes', this.props.followerLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickRemove(ev) {
        this.storeDispatch('removeFollowerFromThread', this.storeProps.follower.threadLocalId, this.props.followerLocalId);
    }
}

Object.assign(Follower, {
    components: { FollowerSubtypesEditDialog },
    props: {
        followerLocalId: String,
    },
    template: 'mail.component.Follower',
});

return Follower;

});
