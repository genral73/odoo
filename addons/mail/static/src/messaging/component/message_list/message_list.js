odoo.define('mail.messaging.component.MessageList', function (require) {
'use strict';

const components = {
    Message: require('mail.messaging.component.Message'),
};
const useRefs = require('mail.messaging.component_hook.useRefs');
const useStore = require('mail.messaging.component_hook.useStore');

const { Component } = owl;
const { useRef } = owl.hooks;

class MessageList extends Component {

    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        useStore(props => {
            const threadViewer = this.env.entities.ThreadViewer.get(props.threadViewer);
            const thread = threadViewer ? threadViewer.thread : undefined;
            const threadCache = threadViewer ? threadViewer.threadCache : undefined;
            return {
                isDeviceMobile: this.env.entities.Device.instance.isMobile,
                messages: threadCache ? threadCache.orderedMessages : [],
                thread,
                threadCache,
                threadViewer,
            };
        }, {
            compareDepth: {
                messages: 1,
            },
        });
        this._getRefs = useRefs();
        /**
         * Determine whether the auto-scroll on load is active or not. This
         * is useful to disable some times, such as when mounting message list
         * in ASC order: the initial scroll position is at the top of the
         * conversation, and most of the time the expected initial scroll
         * position should be at the bottom of the thread. During this time,
         * the programmatical scrolling should not trigger auto-load messages
         * on scroll.
         */
        this._isAutoLoadOnScrollActive = true;
        /**
         * Reference of the "load more" item. Useful to trigger load more
         * on scroll when it becomes visible.
         */
        this._loadMoreRef = useRef('loadMore');
        /**
         * Tracked last thread cache rendered. Useful to determine scroll
         * position on patch if it is on the same thread cache or not.
         */
        this._renderedThreadCache = null;
        /**
         * Tracked last selected message. Useful to determine when patch comes
         * from a message selection on a given thread cache, so that it
         * auto-scroll to that message.
         */
        this._selectedMessage = null;
        /**
         * Snapshot computed during willPatch, which is used by patched.
         */
        this._willPatchSnapshot = undefined;
        this._onScroll = _.throttle(this._onScroll.bind(this), 100);
    }

    mounted() {
        this._update();
    }

    willPatch() {
        const lastMessageRef = this.lastMessageRef;
        this._willPatchSnapshot = {
            isLastMessageVisible:
                lastMessageRef &&
                lastMessageRef.isBottomVisible({ offset: 10 }),
            scrollHeight: this.el.scrollHeight,
            scrollTop: this.el.scrollTop,
        };
    }

    patched() {
        this._update();
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Update the scroll position of the message list.
     * This is not done in patched/mounted hooks because scroll position is
     * dependent on UI globally. To illustrate, imagine following UI:
     *
     * +----------+ < viewport top = scrollable top
     * | message  |
     * |   list   |
     * |          |
     * +----------+ < scrolltop = viewport bottom = scrollable bottom
     *
     * Now if a composer is mounted just below the message list, it is shrinked
     * and scrolltop is altered as a result:
     *
     * +----------+ < viewport top = scrollable top
     * | message  |
     * |   list   | < scrolltop = viewport bottom  <-+
     * |          |                                  |-- dist = composer height
     * +----------+ < scrollable bottom            <-+
     * +----------+
     * | composer |
     * +----------+
     *
     * Because of this, the scroll position must be changed when whole UI
     * is rendered. To make this simpler, this is done when <ThreadViewer/>
     * component is patched. This is acceptable when <ThreadViewer/> has a
     * fixed height, which is the case for the moment.
     */
    async adjustFromComponentHints() {
        for (const hint of this.threadViewer.componentHintList) {
            switch (hint.type) {
                case 'change-of-thread-cache':
                    this._adjustFromChangeOfThreadCache(hint);
                    break;
                case 'current-partner-just-posted-message':
                    this._adjustFromCurrentPartnerJustPostedMessage(hint);
                    break;
                case 'more-messages-loaded':
                    this._adjustFromMoreMessagesLoaded(hint);
                    break;
                default:
                    this.threadViewer.markComponentHintProcessed(hint);
                    break;
            }
        }
        this._willPatchSnapshot = undefined;
    }

    /**
     * @param {mail.messaging.entity.Message} message
     * @returns {string}
     */
    getDateDay(message) {
        const date = message.date.format('YYYY-MM-DD');
        if (date === moment().format('YYYY-MM-DD')) {
            return this.env._t("Today");
        } else if (
            date === moment()
                .subtract(1, 'days')
                .format('YYYY-MM-DD')
        ) {
            return this.env._t("Yesterday");
        }
        return message.date.format('LL');
    }

    /**
     * @returns {integer}
     */
    getScrollTop() {
        return this.el.scrollTop;
    }

    /**
     * @returns {mail.messaging.component.Message|undefined}
     */
    get lastCurrentPartnerMessageRef() {
        const currentPartnerMessageRefs = this.messageRefs.filter(messageRef =>
            (
                messageRef.message.author &&
                messageRef.message.author === this.env.entities.Partner.current
            )
        );
        const { length: l, [l - 1]: lastCurrentPartnerMessageRefs } = currentPartnerMessageRefs;
        return lastCurrentPartnerMessageRefs;
    }

    /**
     * @returns {mail.messaging.component.Message|undefined}
     */
    get lastMessageRef() {
        const { length: l, [l - 1]: lastMessageRef } = this.messageRefs;
        return lastMessageRef;
    }

    /**
     * @param {integer} messageId
     * @returns {mail.messaging.component.Message|undefined}
     */
    messageRefFromId(messageId) {
        return this.messageRefs.find(ref => ref.message.id === messageId);
    }

    /**
     * @returns {mail.messaging.component.Message[]}
     */
    get messageRefs() {
        const refs = this._getRefs();
        return Object.entries(refs)
            .filter(([refId, ref]) =>
                refId.includes(this.env.entities.Message.localId) && ref.message
            )
            .map(([refId, ref]) => ref)
            .sort((ref1, ref2) => (ref1.message.id < ref2.message.id ? -1 : 1));
    }

    /**
     * @returns {mail.messaging.entity.Message[]}
     */
    get orderedMessages() {
        const threadCache = this.threadViewer.threadCache;
        if (this.props.order === 'desc') {
            return [...threadCache.orderedMessages].reverse();
        }
        return threadCache.orderedMessages;
    }

    /**
     * @param {integer} value
     */
    async setScrollTop(value) {
        this._isAutoLoadOnScrollActive = false;
        this.el.scrollTop = value;
        await new Promise(resolve => setTimeout(resolve, 0));
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @param {mail.messaging.entity.Message} prevMessage
     * @param {mail.messaging.entity.Message} message
     * @returns {boolean}
     */
    shouldMessageBeSquashed(prevMessage, message) {
        if (!this.props.hasSquashCloseMessages) {
            return false;
        }
        if (Math.abs(message.date.diff(prevMessage.date)) > 60000) {
            // more than 1 min. elasped
            return false;
        }
        if (prevMessage.message_type !== 'comment' || message.message_type !== 'comment') {
            return false;
        }
        if (prevMessage.author !== message.author) {
            // from a different author
            return false;
        }
        if (prevMessage.originThread !== message.originThread) {
            return false;
        }
        if (
            prevMessage.moderation_status === 'pending_moderation' ||
            message.moderation_status === 'pending_moderation'
        ) {
            return false;
        }
        const prevOriginThread = prevMessage.originThread;
        const originThread = message.originThread;
        if (
            prevOriginThread &&
            originThread &&
            prevOriginThread.model === originThread.model &&
            originThread.model !== 'mail.channel' &&
            prevOriginThread.id !== originThread.id
        ) {
            // messages linked to different document thread
            return false;
        }
        return true;
    }

    /**
     * @returns {mail.messaging.entity.ThreadViewer}
     */
    get threadViewer() {
        return this.env.entities.ThreadViewer.get(this.props.threadViewer);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} hint
     */
    async _adjustFromChangeOfThreadCache(hint) {
        const threadCache = this.threadViewer.threadCache;
        if (!threadCache.isLoaded) {
            return;
        }
        let isProcessed = false;
        if (threadCache.messages.length > 0) {
            if (this.threadViewer.threadCacheInitialPosition !== undefined) {
                this.el.scrollTop = this.threadViewer.threadCacheInitialPosition;
                isProcessed = true;
            } else {
                const lastMessage = threadCache.lastMessage;
                if (this.messageRefFromId(lastMessage.id)) {
                    await this._scrollToLastMessage();
                    isProcessed = true;
                }
            }
        } else {
            isProcessed = true;
        }
        if (isProcessed) {
            this.threadViewer.markComponentHintProcessed(hint);
        }
    }

    /**
     * @private
     * @param {Object} hint
     * @param {integer} hint.messageId
     */
    async _adjustFromCurrentPartnerJustPostedMessage(hint) {
        const threadCache = this.threadViewer.threadCache;
        const { messageId } = hint;
        if (threadCache.isLoaded) {
            const threadCacheMessageIds = threadCache.messages.map(message => message.id);
            if (threadCacheMessageIds.includes(messageId) && this.messageRefFromId(messageId)) {
                await this._scrollToMessage(messageId);
                this.threadViewer.markComponentHintProcessed(hint);
            }
        }
    }

    /**
     * @private
     * @param {Object} hint
     */
    _adjustFromMoreMessagesLoaded(hint) {
        if (!this._willPatchSnapshot) {
            this.threadViewer.markComponentHintProcessed(hint);
            return;
        }
        const { scrollHeight, scrollTop } = this._willPatchSnapshot;
        if (this.props.order === 'asc') {
            this.el.scrollTop = this.el.scrollHeight - scrollHeight + scrollTop;
        }
        this.threadViewer.markComponentHintProcessed(hint);
    }

    /**
     * @private
     */
    _checkThreadMarkAsRead() {
        const thread = this.threadViewer.thread;
        const threadCache = this.threadViewer.threadCache;
        if (!threadCache) {
            return;
        }
        if (threadCache.messages.length === 0) {
            return;
        }
        if (!this.lastMessageRef) {
            return;
        }
        if (
            threadCache === thread.mainCache &&
            this.lastMessageRef.isPartiallyVisible()
        ) {
            thread.markAsSeen();
        }
    }

    /**
     * @private
     * @returns {boolean}
     */
    _isLoadMoreVisible() {
        const loadMore = this._loadMoreRef.el;
        if (!loadMore) {
            return false;
        }
        const loadMoreRect = loadMore.getBoundingClientRect();
        const elRect = this.el.getBoundingClientRect();
        const isInvisible = loadMoreRect.top > elRect.bottom || loadMoreRect.bottom < elRect.top;
        return !isInvisible;
    }

    /**
     * @private
     */
    _loadMore() {
        this.threadViewer.threadCache.loadMoreMessages();
    }

    /**
     * @private
     * @returns {Promise}
     */
    async _scrollToLastMessage() {
        if (!this.lastMessageRef) {
            return;
        }
        this._isAutoLoadOnScrollActive = false;
        await this.lastMessageRef.scrollIntoView();
        if (!this.el) {
            this._isAutoLoadOnScrollActive = true;
            return;
        }
        this.el.scrollTop = this.props.order === 'asc'
            ? this.el.scrollTop + 15
            : this.el.scrollTop - 15;
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @param {integer} messageId
     */
    async _scrollToMessage(messageId) {
        const messageRef = this.messageRefFromId(messageId);
        if (!messageRef) {
            return;
        }
        this._isAutoLoadOnScrollActive = false;
        await messageRef.scrollIntoView();
        if (!this.el) {
            this._isAutoLoadOnScrollActive = true;
            return;
        }
        this.el.scrollTop = this.props.order === 'asc'
            ? this.el.scrollTop + 15
            : this.el.scrollTop - 15;
        this._isAutoLoadOnScrollActive = true;
    }

    /**
     * @private
     */
    _update() {
        this._checkThreadMarkAsRead();
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLoadMore(ev) {
        ev.preventDefault();
        this._loadMore();
    }

    /**
     * @private
     * @param {ScrollEvent} ev
     */
    _onScroll(ev) {
        if (!this.el) {
            // could be unmounted in the meantime (due to throttled behavior)
            return;
        }
        this.threadViewer.saveThreadCacheScrollPositionsAsInitial(this.el.scrollTop);
        if (!this._isAutoLoadOnScrollActive) {
            return;
        }
        if (this._isLoadMoreVisible()) {
            this._loadMore();
        }
        this._checkThreadMarkAsRead();
    }

}

Object.assign(MessageList, {
    components,
    defaultProps: {
        hasMessageCheckbox: false,
        hasSquashCloseMessages: false,
        haveMessagesAuthorRedirect: false,
        haveMessagesMarkAsReadIcon: false,
        haveMessagesReplyIcon: false,
        order: 'asc',
    },
    props: {
        hasMessageCheckbox: Boolean,
        hasSquashCloseMessages: Boolean,
        haveMessagesAuthorRedirect: Boolean,
        haveMessagesMarkAsReadIcon: Boolean,
        haveMessagesReplyIcon: Boolean,
        order: String, // ['asc', 'desc']
        selectedMessage: {
            type: String,
            optional: true,
        },
        threadViewer: String,
    },
    template: 'mail.messaging.component.MessageList',
});

return MessageList;

});
