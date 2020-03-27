odoo.define('mail.messaging.entity.Partner', function (require) {
'use strict';

const { registerNewEntity } = require('mail.messaging.entity.core');

const utils = require('web.utils');

function PartnerFactory({ Entity }) {

    class Partner extends Entity {

        /**
         * @override
         */
        delete() {
            if (this === this.constructor.current) {
                this.constructor.unlink({ current: null });
            }
            if (this === this.constructor.root) {
                this.constructor.unlink({ root: null });
            }
            super.delete();
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        /**
         * Search for partners matching `keyword`.
         *
         * @static
         * @param {Object} param0
         * @param {function} param0.callback
         * @param {string} param0.keyword
         * @param {integer} [param0.limit=10]
         */
        static async imSearch({ callback, keyword, limit = 10 }) {
            // prefetched partners
            let partners = [];
            const searchRegexp = new RegExp(
                _.str.escapeRegExp(utils.unaccent(keyword)),
                'i'
            );
            const currentPartner = Partner.current;
            for (const partner of Partner.all) {
                if (partners.length < limit) {
                    if (
                        partner.id !== currentPartner.id &&
                        searchRegexp.test(partner.name)
                    ) {
                        partners.push(partner);
                    }
                }
            }
            if (!partners.length) {
                const partnersData = await this.env.rpc(
                    {
                        model: 'res.partner',
                        method: 'im_search',
                        args: [keyword, limit]
                    },
                    { shadow: true }
                );
                for (const data of partnersData) {
                    const partner = Partner.insert(data);
                    partners.push(partner);
                }
            }
            callback(partners);
        }

        /**
         * @static
         */
        static async startLoopFetchImStatus() {
            await this._fetchImStatus();
            this._loopFetchImStatus();
        }

        async checkIsUser() {
            const userIds = await this.env.rpc({
                model: 'res.users',
                method: 'search',
                args: [[['partner_id', '=', this.id]]],
            });
            this.update({ userId: userIds.length ? userIds[0] : null });
        }

        /**
         * @returns {string}
         */
        get nameOrDisplayName() {
            return this.name || this.display_name;
        }

        /**
         * Opens an existing or new chat.
         */
        openChat() {
            const chat = this.directPartnerThread;
            if (chat) {
                chat.open();
            } else {
                this.env.entities.Thread.createChannel({
                    autoselect: true,
                    partnerId: this.id,
                    type: 'chat',
                });
            }
        }

        //----------------------------------------------------------------------
        // Private
        //----------------------------------------------------------------------

        /**
         * @static
         * @private
         * @param {Object} param0
         * @param {Object} param0.env
         */
        static async _fetchImStatus() {
            let toFetchPartnersLocalIds = [];
            let partnerIdToLocalId = {};
            const toFetchPartners = this.all.filter(partner => partner.im_status !== null);
            for (const partner of toFetchPartners) {
                toFetchPartnersLocalIds.push(partner.localId);
                partnerIdToLocalId[partner.id] = partner.localId;
            }
            if (!toFetchPartnersLocalIds.length) {
                return;
            }
            const dataList = await this.env.rpc({
                route: '/longpolling/im_status',
                params: {
                    partner_ids: toFetchPartnersLocalIds.map(partnerLocalId =>
                        this.get(partnerLocalId).id
                    ),
                },
            }, { shadow: true });
            for (const { id, im_status } of dataList) {
                this.insert({ id, im_status });
                delete partnerIdToLocalId[id];
            }
            // partners with no im_status => set null
            for (const noImStatusPartnerLocalId of Object.values(partnerIdToLocalId)) {
                const partner = this.get(noImStatusPartnerLocalId);
                if (partner) {
                    partner.update({ im_status: null });
                }
            }
        }

        /**
         * @static
         * @private
         */
        static _loopFetchImStatus() {
            setTimeout(async () => {
                await this._fetchImStatus();
                this._loopFetchImStatus();
            }, 50*1000);
        }

        /**
         * @override
         */
        _createInstanceLocalId(data) {
            return `${this.constructor.localId}_${data.id}`;
        }

        /**
         * @override
         */
        _update(data) {
            const {
                display_name = this.display_name || "",
                email = this.email,
                id = this.id,
                im_status = this.im_status,
                name = this.name,
                userId,
            } = data;

            this._write({
                display_name,
                email,
                id,
                im_status,
                model: 'res.partner',
                name,
            });

            if (userId) {
                const user = this.env.entities.User.insert({ id: userId });
                this.link({ user });
            }
        }

    }

    Object.assign(Partner, {
        relations: Object.assign({}, Entity.relations, {
            authorMessages: {
                inverse: 'author',
                to: 'Message',
                type: 'one2many',
            },
            current: {
                inverse: 'partnerCurrent',
                to: 'Partner',
                type: 'one2one',
            },
            directPartnerThread: {
                inverse: 'directPartner',
                to: 'Thread',
                type: 'one2one',
            },
            memberThreads: {
                inverse: 'members',
                to: 'Thread',
                type: 'many2many',
            },
            partnerCurrent: {
                inverse: 'current',
                to: 'Partner',
                type: 'one2one',
            },
            partnerRoot: {
                inverse: 'root',
                to: 'Partner',
                type: 'one2one',
            },
            root: {
                inverse: 'partnerRoot',
                to: 'Partner',
                type: 'one2one',
            },
            typingMemberThreads: {
                inverse: 'typingMembers',
                to: 'Thread',
                type: 'many2many',
            },
            user: {
                inverse: 'partner',
                to: 'User',
                type: 'one2one',
            },
        }),
    });

    return Partner;
}

registerNewEntity('Partner', PartnerFactory, ['Entity']);

});
