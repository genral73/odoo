odoo.define('mail.store.getters', function (require) {
'use strict';

const emojis = require('mail.emojis');
const mailUtils = require('mail.utils');

const { filterObject } = require('web.utils');

const getters = {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {integer} id
     * @return {Object|undefined}
     */
    activity({ state }, id) {
        return Object.values(state.activities).find(activity => activity.id === id);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of pinned chats
     */
    allOrderedAndPinnedChats({ getters }) {
        return getters.chatList().filter(chat => chat.isPinned);
    },
    /**
     * TODO FIXME move this into im_livechat when we have entities
     *
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {Object} filtered livechats that are pinned
     */
    allOrderedAndPinnedLivechats({ getters }) {
        return getters.livechatList().filter(livechat => livechat.isPinned);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of pinned mailboxes
     */
    allOrderedAndPinnedMailboxes({ getters }) {
        return getters.mailboxList().filter(mailbox => mailbox.isPinned);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of pinned channels
     */
    allOrderedAndPinnedMultiUserChannels({ getters }) {
        return getters.channelList().filter(channel => channel.isPinned);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {integer}
     */
    allPinnedChannelAmount({ getters }) {
        const allOrderedAndPinnedMultiUserChannelsAmount =
            getters.allOrderedAndPinnedMultiUserChannels().length;
        const allOrderedAndPinnedChats =
            getters.allOrderedAndPinnedChats().length;
        // TODO FIXME move this into im_livechat when we have entities
        const allOrderedAndPinnedLivechatsAmount =
            getters.allOrderedAndPinnedLivechats().length;
        return (
            allOrderedAndPinnedMultiUserChannelsAmount +
            allOrderedAndPinnedChats +
            allOrderedAndPinnedLivechatsAmount
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {string|undefined}
     */
    attachmentDefaultSource({ getters, state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        const fileType = getters.attachmentFileType(attachmentLocalId);
        if (fileType === 'image') {
            return `/web/image/${attachment.id}?unique=1&amp;signature=${attachment.checksum}&amp;model=ir.attachment`;
        }
        if (fileType === 'application/pdf') {
            return `/web/static/lib/pdfjs/web/viewer.html?file=/web/content/${attachment.id}?model%3Dir.attachment`;
        }
        if (fileType && fileType.indexOf('text') !== -1) {
            return `/web/content/${attachment.id}?model%3Dir.attachment`;
        }
        if (fileType === 'youtu') {
            if (fileType !== 'youtu') {
                return undefined;
            }
            const urlArr = attachment.url.split('/');
            let token = urlArr[urlArr.length - 1];
            if (token.indexOf('watch') !== -1) {
                token = token.split('v=')[1];
                const amp = token.indexOf('&');
                if (amp !== -1) {
                    token = token.substring(0, amp);
                }
            }
            return `https://www.youtube.com/embed/${token}`;
        }
        if (fileType === 'video') {
            return `/web/image/${attachment.id}?model=ir.attachment`;
        }
        return undefined;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {string}
     */
    attachmentDisplayName({ state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        return attachment.name || attachment.filename;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {string|undefined}
     */
    attachmentExtension({ state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        return attachment.filename && attachment.filename.split('.').pop();
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {string|undefined}
     */
    attachmentFileType({ state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        if (attachment.type === 'url' && !attachment.url) {
            return undefined;
        } else if (!attachment.mimetype) {
            return undefined;
        }
        const match = attachment.type === 'url'
            ? attachment.url.match('(youtu|.png|.jpg|.gif)')
            : attachment.mimetype.match('(image|video|application/pdf|text)');
        if (!match) {
            return undefined;
        }
        if (match[1].match('(.png|.jpg|.gif)')) {
            return 'image';
        }
        return match[1];
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} atttachmentLocalId
     * @param {string|undefined}
     */
    attachmentMediaType({ state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        return attachment.mimetype && attachment.mimetype.split('/').shift();
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {Object} param1
     * @param {integer} param1.resId
     * @param {string} param1.resModel
     * @return {mail.store.model.Attachment[]}
     */
    attachments({ state }, { resId, resModel }) {
        return Object
            .values(state.attachments)
            .filter(attachment => attachment.res_id === resId && attachment.res_model === resModel)
            .sort((att1, att2) => att1.id < att2.id ? -1 : 1);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of channels
     */
    channelList({ getters }) {
        const channels = getters.channels();
        return Object
            .values(channels)
            .sort((channel1, channel2) => {
                const channel1Name = getters.threadName(channel1.localId);
                const channel2Name = getters.threadName(channel2.localId);
                return channel1Name < channel2Name ? -1 : 1;
            });
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are channels
     */
    channels({ state }) {
        return filterObject(state.threads, thread =>
            thread.channel_type === 'channel'
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {string} partnerLocalId
     * @return {mail.store.model.Thread|undefined}
     */
    chatFromPartner({ getters }, partnerLocalId) {
        return getters.chatList().find(chat => chat.directPartnerLocalId === partnerLocalId);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of chats
     */
    chatList({ getters }) {
        const chats = getters.chats();
        return Object
            .values(chats)
            .sort((chat1, chat2) => {
                const chat1Name = getters.threadName(chat1.localId);
                const chat2Name = getters.threadName(chat2.localId);
                return chat1Name < chat2Name ? -1 : 1;
            });
    },
    /**
     * @private
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are chats
     */
    chats({ state }) {
        return filterObject(state.threads, thread =>
            thread.channel_type === 'chat'
        );
    },
    /**
     * Returns whether the given message has any batch action available, for
     * which a checkbox has to be displayed.
     * Currently this is only the case for moderation.
     *
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {string} messageLocalId
     * @return {boolean}
     */
    hasMessageCheckbox({ getters }, messageLocalId) {
        return getters.isMessageModeratedByUser(messageLocalId);
    },
    /**
     * @return {boolean}
     */
    haveVisibleChatWindows({ state }) {
        return state.chatWindowManager.computed.visible.length > 0;
    },
    /**
     * @param {Object} param0
     * @param {Object} param1
     * @return {mail.store.model.Attachment[]} image attachments of the record
     */
    imageAttachments({ getters }, { resId, resModel }) {
        return getters
            .attachments({ resId, resModel })
            .filter(attachment => getters.attachmentMediaType(attachment.localId) === 'image');
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {boolean}
     */
    isAttachmentLinkedToComposer({ state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        return !!attachment.composerId;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {string} attachmentLocalId
     * @return {boolean}
     */
    isAttachmentTextFile({ getters }, attachmentLocalId) {
        const fileType = getters.attachmentFileType(attachmentLocalId);
        return (fileType && fileType.indexOf('text') !== -1) || false;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {Object} param0.state
     * @param {string} attachmentLocalId
     * @return {boolean}
     */
    isAttachmentViewable({ getters, state }, attachmentLocalId) {
        const attachment = state.attachments[attachmentLocalId];
        const mediaType = getters.attachmentMediaType(attachmentLocalId);
        return (
            mediaType === 'image' ||
            mediaType === 'video' ||
            attachment.mimetype === 'application/pdf' ||
            getters.isAttachmentTextFile(attachmentLocalId)
        );
    },
    /**
     * Returns whether the given message is checked in the current thread (based
     * on stringifiedDomain).
     *
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} messageLocalId
     * @param {string} threadLocalId
     * @param {string} stringifiedDomain
     * @return {boolean}
     */
    isMessageChecked({ state }, messageLocalId, threadLocalId, stringifiedDomain) {
        const thread = state.threads[threadLocalId];
        const threadCacheLocalId = thread.cacheLocalIds[stringifiedDomain];
        const threadCache = state.threadCaches[threadCacheLocalId];
        return threadCache.checkedMessageLocalIds.includes(messageLocalId);
    },
    /**
     * Returns whether the given message is moderated by the current user.
     *
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {Object} param0.state
     * @param {string} messageLocalId
     * @return {boolean}
     */
    isMessageModeratedByUser({ getters, state }, messageLocalId) {
        const message = state.messages[messageLocalId];
        if (!message) {
            return false;
        }
        return message.moderation_status === 'pending_moderation' &&
            getters.isThreadModeratedByUser(message.originThreadLocalId);
    },
    /**
     * Returns whether the given thread is moderated by the current user.
     *
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} threadLocalId
     * @return {boolean}
     */
    isThreadModeratedByUser({ state }, threadLocalId) {
        return state.moderatedChannelLocalIds.filter(localId => localId === threadLocalId).length;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} partnerLocalId
     * @return {boolean}
     */
    isPartnerRoot({ state }, partnerLocalId) {
        return state.partnerRootLocalId === partnerLocalId;
    },
    /**
     * TODO FIXME move this into im_livechat when we have entities
     *
     * @private
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are livechats
     */
    livechats({ state }) {
        return filterObject(state.threads, thread =>
            thread.channel_type === 'livechat'
        );
    },
    /**
     * TODO FIXME move this into im_livechat when we have entities
     *
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of livechats
     */
    livechatList({ getters }) {
        const livechats = getters.livechats();
        return Object
            .values(livechats)
            .sort((livechat1, livechat2) => {
                const livechat1Name = getters.threadName(livechat1.localId);
                const livechat2Name = getters.threadName(livechat2.localId);
                // TODO FIXME, should be sorted by create date for consistency maybe?
                // but in master it is sorted by last message date (in discuss)
                // (and should always be by counter (yes/no) and then last message date in messaging menu)
                return livechat1Name < livechat2Name ? -1 : 1;
            });
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {mail.store.model.Thread[]} ordered list of mailboxes
     */
    mailboxList({ getters }) {
        const mailboxes = getters.mailboxes();
        return Object
            .values(mailboxes)
            .sort((mailbox1, mailbox2) => {
                if (mailbox1.localId === 'mail.box_inbox') {
                    return -1;
                }
                if (mailbox2.localId === 'mail.box_inbox') {
                    return 1;
                }
                if (mailbox1.localId === 'mail.box_starred') {
                    return -1;
                }
                if (mailbox2.localId === 'mail.box_starred') {
                    return 1;
                }
                const mailbox1Name = getters.threadName(mailbox1.localId);
                const mailbox2Name = getters.threadName(mailbox2.localId);
                return mailbox1Name < mailbox2Name ? -1 : 1;
            });
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are mailboxes
     */
    mailboxes({ state }) {
        return filterObject(state.threads, thread =>
            thread._model === 'mail.box'
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {mail.store.model.Thread[]} filtered threads that are mail.channels
     */
    mailChannelList({ getters }) {
        const mailChannels = getters.mailChannels();
        return Object
            .values(mailChannels)
            .sort((mailChannel1, mailChannel2) => {
                if (
                    mailChannel1.message_unread_counter &&
                    !mailChannel2.message_unread_counter
                ) {
                    return -1;
                }
                if (
                    mailChannel2.message_unread_counter &&
                    !mailChannel1.message_unread_counter
                ) {
                    return 1;
                }
                // TODO FIXME they are sorted by date of last message on master (for messaging menu)
                if (
                    mailChannel1.message_unread_counter &&
                    mailChannel2.message_unread_counter &&
                    mailChannel1.message_unread_counter !== mailChannel2.message_unread_counter
                ) {
                    return mailChannel1.message_unread_counter > mailChannel2.message_unread_counter ? -1 : 1;
                }
                const mailChannel1Name = getters.threadName(mailChannel1.localId);
                const mailChannel2Name = getters.threadName(mailChannel2.localId);
                return mailChannel1Name < mailChannel2Name ? -1 : 1;
            });
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are mail.channels
     */
    mailChannels({ state }) {
        return filterObject(state.threads, thread =>
            thread._model === 'mail.channel'
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {integer} id
     * @return {Object|undefined}
     */
    mailTemplate({ state }, id) {
        return Object.values(state.mailTemplates).find(activity => activity.id === id);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} messageLocalId
     * @return {string}
     */
    messagePrettyBody({ state }, messageLocalId) {
        const message = state.messages[messageLocalId];
        if (!message) {
            return '';
        }
        let prettyBody;
        for (const emoji of emojis) {
            const { unicode } = emoji;
            const regexp = new RegExp(
                `(?:^|\\s|<[a-z]*>)(${unicode})(?=\\s|$|</[a-z]*>)`,
                "g"
            );
            const originalBody = message.body;
            prettyBody = message.body.replace(
                regexp,
                ` <span class="o_mail_emoji">${unicode}</span> `
            );
            // Idiot-proof limit. If the user had the amazing idea of
            // copy-pasting thousands of emojis, the image rendering can lead
            // to memory overflow errors on some browsers (e.g. Chrome). Set an
            // arbitrary limit to 200 from which we simply don't replace them
            // (anyway, they are already replaced by the unicode counterpart).
            if (_.str.count(prettyBody, "o_mail_emoji") > 200) {
                prettyBody = originalBody;
            }
        }
        // add anchor tags to urls
        return mailUtils.parseAndTransform(prettyBody, mailUtils.addLink);
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @param {Object} param1
     * @param {integer} param1.resId
     * @param {string} param1.resModel
     * @return {mail.store.model.Attachment[]} non-image attachments of the record
     */
    nonImageAttachments({ getters }, { resId, resModel }) {
        return getters
            .attachments({ resId, resModel })
            .filter(attachment => getters.attachmentMediaType(attachment.localId) !== 'image');
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} partnerLocalId
     * @return {string}
     */
    partnerName({ state }, partnerLocalId) {
        const partner = state.partners[partnerLocalId];
        return partner.name || partner.display_name;
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {Object} filtered channels that are pinned
     */
    pinnedChannels({ getters }) {
        const channels = getters.channels();
        return filterObject(channels, channel =>
            channel.isPinned
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {Object} filtered chats that are pinned
     */
    pinnedChats({ getters }) {
        const chats = getters.chats();
        return filterObject(chats, chat =>
            chat.isPinned
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.getters
     * @return {Object} filtered mailboxes that are pinned
     */
    pinnedMailboxes({ getters }) {
        const mailboxes = getters.mailboxes();
        return filterObject(mailboxes, mailBox =>
            mailBox.isPinned
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @return {Object} filtered threads that are pinned
     */
    pinnedThreads({ state }) {
        return filterObject(state.threads, thread =>
            thread.isPinned
        );
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {Object} param1
     * @param {string} param1._model
     * @param {integer} param1.id
     * @return {mail.store.Thread|undefined}
     */
    thread({ state }, { _model, id }) {
        return state.threads[`${_model}_${id}`];
    },
    /**
     * @param {Object} param0
     * @param {Object} param0.state
     * @param {string} threadLocalId
     * @return {string}
     */
    threadName({ state }, threadLocalId) {
        const thread = state.threads[threadLocalId];
        if (thread.channel_type === 'chat' && thread.directPartnerLocalId) {
            const directPartner = state.partners[thread.directPartnerLocalId];
            return thread.custom_channel_name || directPartner.name;
        }
        // TODO FIXME move this into im_livechat when we have entities
        if (thread.channel_type === 'livechat' && thread.correspondent_name) {
            return thread.correspondent_name;
        }
        return thread.name;
    },
};

return getters;

});
