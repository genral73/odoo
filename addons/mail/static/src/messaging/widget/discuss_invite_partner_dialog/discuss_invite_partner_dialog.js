odoo.define('mail.messaging.widget.DiscussInvitePartnerDialog', function (require) {
'use strict';

const core = require('web.core');
const Dialog = require('web.Dialog');

const _lt = core._lt;
const QWeb = core.qweb;

/**
 * Widget : Invite People to Channel Dialog
 *
 * Popup containing a 'many2many_tags' custom input to select multiple partners.
 * Searches user according to the input, and triggers event when selection is
 * validated.
 */
const PartnerInviteDialog = Dialog.extend({
    dialog_title: _lt("Invite people"),
    template: 'mail.messaging.widget.DiscussInvitePartnerDialog',
    /**
     * @override {web.Dialog}
     * @param {mail.messaging.widget.Discuss} parent
     * @param {Object} param1
     * @param {string} param1.activeThreadLocalId
     * @param {Object} param1.messagingEnv
     * @param {Object} param1.messagingEnv.store
     */
    init(parent, { activeThreadLocalId, messagingEnv }) {
        const store = messagingEnv.store;
        const channelName = store.getters.threadName(activeThreadLocalId);
        this.channelId = store.state.threads[activeThreadLocalId].id;
        this.store = store;
        this._super(parent, {
            title: _.str.sprintf(this.env._t("Invite people to #%s"), channelName),
            size: 'medium',
            buttons: [{
                text: this.env._t("Invite"),
                close: true,
                classes: 'btn-primary',
                click: ev => this._invite(ev),
            }],
        });
    },
    /**
     * @override {web.Dialog}
     * @returns {Promise}
     */
    start() {
        this.$input = this.$('.o_input');
        this.$input.select2({
            width: '100%',
            allowClear: true,
            multiple: true,
            formatResult: item => {
                let status;
                // TODO FIXME fix this, why do we even have an old widget here
                if (item.id === 'odoobot') {
                    status = 'bot';
                } else {
                    const partnerLocalId = `res.partner_${item.id}`;
                    const partner = this.store.state.partners[partnerLocalId];
                    status = partner.im_status;
                }
                const $status = QWeb.render('mail.messaging.widget.UserStatus', { status });
                return $('<span>').text(item.text).prepend($status);
            },
            query: query => {
                this.store.dispatch('searchPartners', {
                    callback: partners => {
                        let results = partners.map(partner => {
                            return {
                                id: partner.id,
                                label: this.store.getters.partnerName(partner.localId),
                                text: this.store.getters.partnerName(partner.localId),
                                value: this.store.getters.partnerName(partner.localId),
                            };
                        });
                        results = _.sortBy(results, 'label');
                        query.callback({ results });
                    },
                    keyword: query.term,
                    limit: 20,
                });
            }
        });
        return this._super(...arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    async _invite() {
        const data = this.$input.select2('data');
        if (data.length === 0) {
            return;
        }
        await this._rpc({
            model: 'mail.channel',
            method: 'channel_invite',
            args: [this.channelId],
            kwargs: {
                partner_ids: _.pluck(data, 'id')
            },
        });
        const names = _.escape(_.pluck(data, 'text').join(', '));
        const notification = _.str.sprintf(
            this.env._t("You added <b>%s</b> to the conversation."),
            names
        );
        this.do_notify(this.env._t("New people"), notification);
    },
});

return PartnerInviteDialog;

});
