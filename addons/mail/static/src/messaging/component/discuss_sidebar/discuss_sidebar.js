odoo.define('mail.messaging.component.DiscussSidebar', function (require) {
'use strict';

const components = {
    AutocompleteInput: require('mail.messaging.component.AutocompleteInput'),
    DiscussSidebarItem: require('mail.messaging.component.DiscussSidebarItem'),
};
const useStore = require('mail.messaging.component_hook.useStore');

const { Component, useState } = owl;
const { useGetters, useRef } = owl.hooks;

class DiscussSidebar extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({ quickSearchValue: "" });
        this.storeGetters = useGetters();
        this.storeProps = useStore((...args) => this._useStoreSelector(...args), {
            compareDepth: () => this._useStoreCompareDepth(),
        });
        /**
         * Reference of the quick search input. Useful to filter channels and
         * chats based on this input content.
         */
        this._quickSearchRef = useRef('quickSearch');
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Return the list of channels that match the quick search value input.
     *
     * @return {mail.store.model.Thread[]}
     */
    get quickSearchChannelList() {
        if (!this.state.quickSearchValue) {
            return this.storeProps.pinnedChannelList;
        }
        const qsVal = this.state.quickSearchValue.toLowerCase();
        return this.storeProps.pinnedChannelList.filter(channel => {
            const nameVal = this.storeGetters.threadName(channel.localId).toLowerCase();
            return nameVal.includes(qsVal);
        });
    }

    /**
     * Return the list of chats that match the quick search value input.
     *
     * @return {mail.store.model.Thread[]}
     */
    get quickSearchChatList() {
        if (!this.state.quickSearchValue) {
            return this.storeProps.pinnedChatList;
        }
        const qsVal = this.state.quickSearchValue.toLowerCase();
        return this.storeProps.pinnedChatList.filter(chat => {
            const nameVal = this.storeGetters.threadName(chat.localId).toLowerCase();
            return nameVal.includes(qsVal);
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @returns {Object}
     */
    _useStoreCompareDepth() {
        return {
            pinnedChannelList: 1,
            pinnedChatList: 1,
            pinnedMailboxList: 1,
            pinnedMailChannelAmount: 1,
        };
    }
    /**
     * @private
     * @param {Object} state
     * @param {Object} props
     * @returns {Object}
     */
    _useStoreSelector(state, props) {
        return {
            pinnedChannelList: this.storeGetters.pinnedChannelList(),
            pinnedChatList: this.storeGetters.pinnedChatList(),
            pinnedMailboxList: this.storeGetters.pinnedMailboxList(),
            pinnedMailChannelAmount: this.storeGetters.pinnedMailChannelAmount(),
        };
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on add channel icon.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChannelAdd(ev) {
        ev.stopPropagation();
        this.trigger('o-discuss-adding-channel');
    }

    /**
     * Called when clicking on channel title.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChannelTitle(ev) {
        ev.stopPropagation();
        return this.env.do_action({
            name: this.env._t("Public Channels"),
            type: 'ir.actions.act_window',
            res_model: 'mail.channel',
            views: [[false, 'kanban'], [false, 'form']],
            domain: [['public', '!=', 'private']]
        });
    }

    /**
     * Called when clicking on add chat icon.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClickChatAdd(ev) {
        ev.stopPropagation();
        this.trigger('o-discuss-adding-chat');
    }

    /**
     * Called when clicking on a item: select the thread of this item as
     * discuss active thread. AKU TODO: maybe turn this into store dispatch?
     *
     * @private
     * @param {CustomEvent} ev
     * @param {Object} ev.detail
     * @param {string} ev.detail.threadLocalId
     */
    _onClickedItem(ev) {
        return this.trigger('o-select-thread', {
            threadLocalId: ev.detail.threadLocalId,
        });
    }

    /**
     * @private
     * @param {CustomEvent} ev
     */
    _onHideAddingItem(ev) {
        ev.stopPropagation();
        this.trigger('o-discuss-cancel-adding-item');
    }

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onInputQuickSearch(ev) {
        ev.stopPropagation();
        this.state.quickSearchValue = this._quickSearchRef.el.value;
    }
}

Object.assign(DiscussSidebar, {
    components,
    props: {
        activeThreadLocalId: {
            type: String,
            optional: true,
        },
        isAddingChannel: Boolean,
        isAddingChat: Boolean,
        onAddChannelAutocompleteSelect: Function,
        onAddChannelAutocompleteSource: Function,
        onAddChatAutocompleteSelect: Function,
        onAddChatAutocompleteSource: Function,
    },
    template: 'mail.messaging.component.DiscussSidebar',
});

return DiscussSidebar;

});
