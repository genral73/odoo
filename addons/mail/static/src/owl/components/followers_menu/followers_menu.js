odoo.define('mail.component.FollowersMenu', function (require) {
'use strict';

const Follower = require('mail.component.Follower');
const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useRef, useState } = owl.hooks;

class FollowersMenu extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            dropdownIsShown: false,
        });
        this.storeProps = useStore((state, props) => {
            const thread = state.threads[props.threadLocalId];
            // const followers = thread.followerLocalIds.map(localId => state.followers[localId]);
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
     * Close the dropdown when clicking outside of it.
     * @private
     * @param {MouseEvent} ev
     */
    _onClickCaptureGlobal(ev) {
        // since dropdown is conditionally shown based on state, dropdownRef can be null
        if (this._dropdownRef.el && !this._dropdownRef.el.contains(ev.target)) {
            this.state.dropdownIsShown = false;
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollow(ev) {
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollowers(ev) {
        this.state.dropdownIsShown = !this.state.dropdownIsShown;
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
