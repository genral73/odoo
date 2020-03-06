odoo.define('mail.component.FollowersMenu', function (require) {
'use strict';

const Follower = require('mail.component.Follower');
const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch, useRef, useState } = owl.hooks;

class FollowersMenu extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            hasDropdown: false,
        });
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const thread = state.threads[props.threadLocalId];
            return {
                followersAmount: thread && thread.followerLocalIds
                    ? thread.followerLocalIds.length
                    : 0,
                thread,
            };
        });
        this._dropdownRef = useRef('dropdown');
        this._onClickCaptureGlobal = this._onClickCaptureGlobal.bind(this);
    }

    /**
     * @override
     */
    mounted() {
        document.addEventListener('click', this._onClickCaptureGlobal, true);
    }

    /**
     * @override
     */
    willUnmount() {
        document.removeEventListener('click', this._onClickCaptureGlobal, true);
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    async _onClickAddChannels(ev) {
        ev.preventDefault();
        await this.storeDispatch('addChannelFollowersToThread', this.props.threadLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    async _onClickAddFollowers(ev) {
        ev.preventDefault();
        await this.storeDispatch('addPartnerFollowersToThread', this.props.threadLocalId);
    }

    /**
     * Close the dropdown when clicking outside of it.
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        // since dropdown is conditionally shown based on state, dropdownRef can be null
        if (this._dropdownRef.el && !this._dropdownRef.el.contains(ev.target)) {
            this.state.hasDropdown = false;
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollow(ev) {
        // TODO
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollowers(ev) {
        this.state.hasDropdown = !this.state.hasDropdown;
    }
}

Object.assign(FollowersMenu, {
    components: { Follower },
    default_props: {
        isDisabled: false,
    },
    props: {
        isDisabled: Boolean,
        threadLocalId: String,
    },
    template: 'mail.component.FollowersMenu',
});

return FollowersMenu;

});
