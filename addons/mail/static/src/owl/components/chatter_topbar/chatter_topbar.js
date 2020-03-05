odoo.define('mail.component.ChatterTopbar', function (require) {
'use strict';

const FollowersMenu = require('mail.component.FollowersMenu');
const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch } = owl.hooks;

class ChatterTopbar extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeProps = useStore((state, props) => {
            const chatter = state.chatters[props.chatterLocalId];
            const thread = chatter.threadLocalId
                ? state.threads[chatter.threadLocalId]
                : undefined;
            return {
                areAttachmentsLoaded: thread && thread.areAttachmentsLoaded,
                attachmentsAmount: thread && thread.attachmentLocalIds
                    ? thread.attachmentLocalIds.length
                    : 0,
                chatter,
            };
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAttachments(ev) {
        if (this.storeProps.chatter.isAttachmentBoxVisible) {
            this.storeDispatch('hideChatterAttachmentBox', this.props.chatterLocalId);
        } else {
            this.storeDispatch('showChatterAttachmentBox', this.props.chatterLocalId);
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLogNote(ev) {
        if (this.storeProps.chatter.isComposerVisible && this.storeProps.chatter.isComposerLog) {
            this.storeDispatch('hideChatterComposer', this.props.chatterLocalId);
        } else {
            this.storeDispatch('showChatterLogNote', this.props.chatterLocalId);
        }
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickScheduleActivity(ev) {
        const action = {
            type: 'ir.actions.act_window',
            name: this.env._t("Schedule Activity"),
            res_model: 'mail.activity',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'new',
            context: {
                default_res_id: this.storeProps.chatter.threadId,
                default_res_model: this.storeProps.chatter.threadModel,
            },
            res_id: false,
        };
        return this.env.do_action(action, {
            on_close: () => {
                // A bit "extreme", could be improved : normally only an activity is created (no update nor delete)
                this.storeDispatch('refreshChatterActivities', this.props.chatterLocalId);
            }
        });
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSendMessage(ev) {
        if (this.storeProps.chatter.isComposerVisible && !this.storeProps.chatter.isComposerLog) {
            this.storeDispatch('hideChatterComposer', this.props.chatterLocalId);
        } else {
            this.storeDispatch('showChatterSendMessage', this.props.chatterLocalId);
        }
    }
}

Object.assign(ChatterTopbar, {
    components: { FollowersMenu },
    props: {
        chatterLocalId: String,
    },
    template: 'mail.component.ChatterTopbar',
});

return ChatterTopbar;

});
