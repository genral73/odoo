odoo.define('mail.component.NotificationListTests', function (require) {
'use strict';

const NotificationList = require('mail.component.NotificationList');
const {
    afterEach: utilsAfterEach,
    afterNextRender,
    beforeEach: utilsBeforeEach,
    pause,
    start: utilsStart,
} = require('mail.messagingTestUtils');

QUnit.module('mail.messaging', {}, function () {
QUnit.module('component', {}, function () {
QUnit.module('NotificationList', {
    beforeEach() {
        utilsBeforeEach(this);

        /**
         * @param {string} threadLocalId
         * @param {Object} [otherProps]
         */
        this.createNotificationListComponent = async ({filter = 'all'}) => {
            NotificationList.env = this.env;
            this.notificationList = new NotificationList(null, { filter });
            await this.notificationList.mount(this.widget.el);
            await afterNextRender();
        };

        this.start = async params => {
            let { env, widget } = await utilsStart(Object.assign({}, params, {
                data: this.data,
            }));
            this.env = env;
            this.widget = widget;
        };
    },
    afterEach() {
        utilsAfterEach(this);
        if (this.notificationList) {
            this.notificationList.destroy();
        }
        if (this.widget) {
            this.widget.destroy();
        }
        this.env = undefined;
        delete NotificationList.env;
    }
});

QUnit.test('base rendering', async function (assert) {
    assert.expect(9);
    Object.assign(this.data.initMessaging, {
        channel_slots: {
            channel_channel: [{
                channel_type: "channel",
                id: 100,
                name: "Channel 2019",
                message_unread_counter: 0,
            }, {
                channel_type: "channel",
                id: 200,
                name: "Channel 2020",
                message_unread_counter: 0,
            }],
        },
    });
    await this.start({
        debug:true,
        async mockRPC(route, args) {
            if (args.method === 'channel_fetch_preview') {
                // Just return a single message
                return [
                    {
                        id: 100,
                        last_message: {
                            author_id: [100, `Author A`],
                            body: `<p>Message A</p>`,
                            channel_ids: [100],
                            date: `2019-01-01 00:00:00`,
                            id: 42,
                            message_type: 'comment',
                            model: 'mail.channel',
                            record_name: 'Channel 2019',
                            res_id: 100,
                        },
                    },
                    {
                        id: 200,
                        last_message: {
                            author_id: [200, `Author B`],
                            body: `<p>Message B</p>`,
                            channel_ids: [200],
                            date: `2020-01-01 00:00:00`,
                            id: 43,
                            message_type: 'comment',
                            model: 'mail.channel',
                            record_name: 'Channel 2020',
                            res_id: 200,
                        },
                    }
                ];
            }
            return this._super(...arguments);
        }
    });
    await this.createNotificationListComponent({filter: 'all'});
    assert.containsN(document.body, '.o_ThreadPreview', 2,
            "there should be two thread previews");
    let threadPreviewsInDOM = document.querySelectorAll('.o_ThreadPreview');
    assert.strictEqual(
        threadPreviewsInDOM[0].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2020',
        "First channel in the list should be the channel of 2020 (more recent)"
    );
    assert.strictEqual(
        threadPreviewsInDOM[1].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2019',
        "First channel in the list should be the channel of 2019 (least recent)"
    );

    // simulate receiving a new message : should change the order
    // as new message has been received in "Channel 2019"
    // (even if older than last message of "Channel 2020")
    let messageData = {
        author_id: [7, "Demo User"],
        body: "<p>New message !</p>",
        channel_ids: [100],
        date: "2019-03-23 10:00:00",
        id: 44,
        message_type: 'comment',
        model: 'mail.channel',
        record_name: 'Channel 2019',
        res_id: 100,
    };
    this.widget.call('bus_service', 'trigger', 'notification', [
        [['my-db', 'mail.channel', 100], messageData]
    ]);
    await afterNextRender();
    assert.containsN(document.body, '.o_ThreadPreview', 2,
            "there should still be two thread previews");
    threadPreviewsInDOM = document.querySelectorAll('.o_ThreadPreview');
    assert.strictEqual(
        threadPreviewsInDOM[0].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2019',
        "First channel in the list should now be 'Channel 2019'"
    );
    assert.strictEqual(
        threadPreviewsInDOM[1].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2020',
        "First channel in the list should now be 'Channel 2020'"
    );

    // simulate receiving a new message again : should change the order again
    // now the message in "Channel 2020" is more recent than the one in
    // "Channel 2019"
    messageData = {
        author_id: [7, "Demo User"],
        body: "<p>New message in 2020 !</p>",
        channel_ids: [200],
        date: "2020-03-23 10:00:00",
        id: 45,
        message_type: 'comment',
        model: 'mail.channel',
        record_name: 'Channel 2020',
        res_id: 200,
    };
    this.widget.call('bus_service', 'trigger', 'notification', [
        [['my-db', 'mail.channel', 200], messageData]
    ]);
    await afterNextRender();
    assert.containsN(document.body, '.o_ThreadPreview', 2,
            "there should still be two thread previews");
    threadPreviewsInDOM = document.querySelectorAll('.o_ThreadPreview');
    assert.strictEqual(
        threadPreviewsInDOM[0].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2020',
        "First channel in the list should now be 'Channel 2020'"
    );
    assert.strictEqual(
        threadPreviewsInDOM[1].querySelector('.o_ThreadPreview_name').textContent,
        'Channel 2019',
        "First channel in the list should now be 'Channel 2019'"
    );
});

});
});
});
