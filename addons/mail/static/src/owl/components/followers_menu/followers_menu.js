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
            hasUnfollowHover: false,
        });
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const thread = state.threads[props.threadLocalId];
            const followerLocalIds = thread ? thread.followerLocalIds : [];
            const followers = followerLocalIds.map(
                followerLocalId => state.followers[followerLocalId]);
            const isFollowing = !!followers.find(
                follower => follower.partnerId === this.env.session.partner_id);
            return {
                followersAmount: followerLocalIds.length,
                isFollowing,
                thread,
            };
        });
        this._dropdownRef = useRef('dropdown');
        this._onClickCaptureGlobal = this._onClickCaptureGlobal.bind(this);
    }

    mounted() {
        document.addEventListener('click', this._onClickCaptureGlobal, true);
    }

    willUnmount() {
        document.removeEventListener('click', this._onClickCaptureGlobal, true);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _hide() {
        this.state.hasDropdown = false;
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
        this._hide();
        await this.storeDispatch('addChannelFollowersToThread', this.props.threadLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    async _onClickAddFollowers(ev) {
        ev.preventDefault();
        this._hide();
        await this.storeDispatch('addPartnerFollowersToThread', this.props.threadLocalId);
    }

    /**
     * Close the dropdown when clicking outside of it.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        // since dropdown is conditionally shown based on state, dropdownRef can be null
        if (this._dropdownRef.el && !this._dropdownRef.el.contains(ev.target)) {
            this._hide();
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollow(ev) {
        this.storeDispatch('followThread', this.props.threadLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollowersButton(ev) {
        this.state.hasDropdown = !this.state.hasDropdown;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollower(ev) {
        this._hide();
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickUnfollow(ev) {
        this.storeDispatch('unfollowThread', this.props.threadLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onMouseLeaveUnfollow(ev) {
        this.state.hasUnfollowHover = false;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onMouseEnterUnfollow(ev) {
        this.state.hasUnfollowHover = true;
    }
}

Object.assign(FollowersMenu, {
    components: { Follower },
    defaultProps: {
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
