odoo.define('mail.messaging.component.DiscussSidebarItem', function (require) {
'use strict';

const components = {
    EditableText: require('mail.messaging.component.EditableText'),
    ThreadIcon: require('mail.messaging.component.ThreadIcon'),
};
const useStore = require('mail.messaging.component_hook.useStore');

const Dialog = require('web.Dialog');

const { Component, useState } = owl;
const { useDispatch, useGetters } = owl.hooks;

class DiscussSidebarItem extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            /**
             * Determine whether this discuss item is currently being renamed.
             */
            isRenaming: false,
        });
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, props) => {
            const thread = state.threads[props.threadLocalId];
            const directPartner = thread.directPartnerLocalId
                ? state.partners[thread.directPartnerLocalId]
                : undefined;
            return {
                directPartner,
                thread,
                threadName: this.storeGetters.threadName(props.threadLocalId),
            };
        });
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {boolean}
     */
    hasUnpin() {
        return this.thread.channel_type === 'chat';
    }
    /**
     * Get the counter of this discuss item, which is based on the thread type.
     *
     * @returns {integer}
     */
    get counter() {
        if (this.thread._model === 'mail.box') {
            return this.thread.counter;
        } else if (this.thread.channel_type === 'channel') {
            return this.thread.message_needaction_counter;
        } else if (this.thread.channel_type === 'chat') {
            return this.thread.message_unread_counter;
        }
        return 0;
    }

    /**
     * @returns {mail.messaging.entity.Thread}
     */
    get thread() {
        return this.storeProps.thread;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @returns {Promise}
     */
    _askAdminConfirmation() {
        return new Promise(resolve => {
            Dialog.confirm(this,
                this.env._t("You are the administrator of this channel. Are you sure you want to leave?"),
                {
                    buttons: [
                        {
                            text: this.env._t("Leave"),
                            classes: 'btn-primary',
                            close: true,
                            click: resolve
                        },
                        {
                            text: this.env._t("Discard"),
                            close: true
                        }
                    ]
                }
            );
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onCancelRenaming(ev) {
        this.state.isRenaming = false;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        this.trigger('o-clicked', {
            threadLocalId: this.props.threadLocalId,
        });
    }

    /**
     * Stop propagation to prevent selecting this item.
     *
     * @private
     * @param {CustomEvent} ev
     */
    _onClickedEditableText(ev) {
        ev.stopPropagation();
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    async _onClickLeave(ev) {
        ev.stopPropagation();
        if (this.thread.create_uid === this.env.session.uid) {
            await this._askAdminConfirmation();
        }
        this.storeDispatch('unsubscribeFromChannel', this.props.threadLocalId);
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickRename(ev) {
        ev.stopPropagation();
        this.state.isRenaming = true;
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSettings(ev) {
        ev.stopPropagation();
        return this.env.do_action({
            type: 'ir.actions.act_window',
            res_model: this.thread._model,
            res_id: this.thread.id,
            views: [[false, 'form']],
            target: 'current'
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickUnpin(ev) {
        ev.stopPropagation();
        return this.storeDispatch('unsubscribeFromChannel', this.thread.localId);
    }

    /**
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.newName
     */
    _onRename(ev) {
        ev.stopPropagation();
        this.state.isRenaming = false;
        this.storeDispatch('renameThread',
            this.props.threadLocalId,
            ev.detail.newName);
    }

}

Object.assign(DiscussSidebarItem, {
    components,
    defaultProps: {
        isActive: false,
    },
    props: {
        isActive: Boolean,
        threadLocalId: String,
    },
    template: 'mail.messaging.component.DiscussSidebarItem',
});

return DiscussSidebarItem;

});
