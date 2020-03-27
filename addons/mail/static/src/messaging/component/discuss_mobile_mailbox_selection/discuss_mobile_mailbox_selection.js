odoo.define('mail.messaging.component.DiscussMobileMailboxSelection', function (require) {
'use strict';

const useStore = require('mail.messaging.component_hook.useStore');

const { Component } = owl;
const { useGetters } = owl.hooks;

class DiscussMobileMailboxSelection extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeGetters = useGetters();
        this.storeProps = useStore(() => {
            return {
                pinnedMailboxList: this.storeGetters.pinnedMailboxList(),
            };
        }, {
            compareDepth: {
                pinnedMailboxList: 1,
            },
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Called when clicking on a mailbox selection item.
     *
     * @private
     * @param {MouseEvent} ev
     */
    _onClick(ev) {
        this.trigger('o-select-thread', {
            threadLocalId: ev.currentTarget.dataset.mailboxLocalId,
        });
    }
}

Object.assign(DiscussMobileMailboxSelection, {
    props: {
        activeThreadLocalId: {
            type: String,
            optional: true,
        },
    },
    template: 'mail.messaging.component.DiscussMobileMailboxSelection',
});

return DiscussMobileMailboxSelection;

});
