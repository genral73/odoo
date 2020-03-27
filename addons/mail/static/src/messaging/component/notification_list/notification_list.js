odoo.define('mail.messaging.component.NotificationList', function (require) {
'use strict';

const components = {
    ThreadPreview: require('mail.messaging.component.ThreadPreview'),
};
const useStore = require('mail.messaging.component_hook.useStore');

const { Component } = owl;

class NotificationList extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeProps = useStore((...args) => this._useStoreSelector(...args), {
            compareDepth: {
                // list + notification object created in useStore
                notifications: 2,
            },
        });
    }

    mounted() {
        this._loadPreviews();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @returns {Object[]}
     */
    get notifications() {
        const { notifications } = this.storeProps;
        return notifications;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Load previews of given thread. Basically consists of fetching all missing
     * last messages of each thread.
     *
     * @private
     */
    async _loadPreviews() {
        const { notifications } = this.storeProps;
        const threads = notifications
            .filter(notification => notification.thread)
            .map(notification => this.env.entities.Thread.get(notification.thread));
        this.env.entities.Thread.loadPreviews(threads);
    }

    /**
     * @private
     * @param {Object} props
     */
    _useStoreSelector(props) {
        const threads = this._useStoreSelectorThreads(props);
        const notifications = threads.map(thread => {
            return {
                thread: thread,
                type: 'thread',
                uniqueId: thread.localId,
            };
        });
        return {
            isDeviceMobile: this.env.entities.Device.instance.isMobile,
            notifications,
        };
    }

    /**
     * @private
     * @param {Object} props
     * @returns {mail.messaging.entity.Thread[]}
     */
    _useStoreSelectorThreads(props) {
        if (props.filter === 'mailbox') {
            return this.env.entities.Thread.allOrderedAndPinnedMailboxes;
        } else if (props.filter === 'channel') {
            return this.env.entities.Thread.allOrderedAndPinnedMultiUserChannels;
        } else if (props.filter === 'chat') {
            return this.env.entities.Thread.allOrderedAndPinnedChats;
        } else if (props.filter === 'all') {
            // "All" filter is for channels and chats
            return this.env.entities.Thread.allOrderedAndPinnedChannels;
        } else {
            throw new Error(`Unsupported filter ${props.filter}`);
        }
    }

}

Object.assign(NotificationList, {
    _allowedFilters: ['all', 'mailbox', 'channel', 'chat'],
    components,
    defaultProps: {
        filter: 'all',
    },
    props: {
        filter: {
            type: String,
            validate: prop => NotificationList._allowedFilters.includes(prop),
        },
    },
    template: 'mail.messaging.component.NotificationList',
});

return NotificationList;

});
