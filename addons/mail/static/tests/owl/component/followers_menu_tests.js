odoo.define('mail.component.FollowersMenuTests', function (require) {
'use strict';

const FollowersMenu = require('mail.component.FollowersMenu');
const {
    afterEach: utilsAfterEach,
    afterNextRender,
    beforeEach: utilsBeforeEach,
    pause,
    start: utilsStart,
} = require('mail.messagingTestUtils');

QUnit.module('mail.messaging', {}, function () {
QUnit.module('component', {}, function () {
QUnit.module('FollowersMenu', {
    beforeEach() {
        utilsBeforeEach(this);
        this.createFollowersMenuComponent = async (threadLocalId, otherProps={}) => {
            FollowersMenu.env = this.env;
            this.followers_menu = new FollowersMenu(null,
                Object.assign(otherProps, { threadLocalId }));
            await this.followers_menu.mount(this.widget.el);
        };
        this.start = async params => {
            if (this.widget) {
                this.widget.destroy();
            }
            let { env, widget } = await utilsStart(Object.assign({}, params, {
                data: this.data,
            }));
            this.env = env;
            this.widget = widget;
        };
    },
    afterEach() {
        utilsAfterEach(this);
        if (this.followers_menu) {
            this.followers_menu.destroy();
        }
        if (this.widget) {
            this.widget.destroy();
        }
        this.env = undefined;
        delete FollowersMenu.env;
    }
});

QUnit.test('base rendering not editable', async function (assert) {
    assert.expect(7);

    await this.start();
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId, { isDisabled: true });
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollow').length,
        1,
        "should have 'Follow' button"
    );
    assert.ok(
        document.querySelector('.o_FollowersMenu_buttonFollow').disabled,
        "'Follow' button should be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollowers').length,
        1,
        "should have followers button"
    );
    assert.ok(
        document.querySelector('.o_FollowersMenu_buttonFollowers').disabled,
        "followers button should be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        0,
        "followers dropdown should not be opened"
    );
    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        0,
        "followers dropdown should still be closed as button is disabled"
    );
});

QUnit.test('base rendering editable', async function (assert) {
    assert.expect(7);

    await this.start();
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollow').length,
        1,
        "should have 'Follow' button"
    );
    assert.notOk(
        document.querySelector('.o_FollowersMenu_buttonFollow').disabled,
        "'Follow' button should not be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollowers').length,
        1,
        "should have followers button"
    );
    assert.notOk(
        document.querySelector('.o_FollowersMenu_buttonFollowers').disabled,
        "followers button should not be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        0,
        "followers dropdown should not be opened"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        1,
        "followers dropdown should be opened"
    );
});

QUnit.test('click on add followers', async function (assert) {
    assert.expect(12);

    await this.start({
        intercepts: {
            do_action: function (event) {
                assert.step('add_followers_action');
                assert.strictEqual(
                    event.data.action.context.default_res_model,
                    'res.partner',
                    "'The 'add followers' action should contain thread model in context'");
                assert.notOk(
                    event.data.action.context.mail_invite_follower_channel_only,
                    "The 'add followers' action should not be restricted to channels only");
                assert.strictEqual(
                    event.data.action.context.default_res_id,
                    100,
                    "The 'add followers' action should contain thread id in context");
                assert.strictEqual(
                    event.data.action.res_model,
                    'mail.wizard.invite',
                    "The 'add followers' action should be a wizard invite of mail module");
                assert.strictEqual(
                    event.data.action.type,
                    "ir.actions.act_window",
                    "The 'add followers' action should be of type 'ir.actions.act_window'");
            },
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollowers').length,
        1,
        "should have followers button"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        1,
        "followers dropdown should be opened"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_addFollowersButton').length,
        1,
        "followers dropdown should contain a 'Add followers' button"
    );
    await document.querySelector('.o_FollowersMenu_addFollowersButton').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        0,
        "followers dropdown should be closed after click on 'Add followers'"
    );
    assert.verifySteps(
        ['add_followers_action'],
        "Click on 'Add followers' should trigger the right action"
    );
});

QUnit.test('click on add channels', async function (assert) {
    assert.expect(12);

    await this.start({
        intercepts: {
            do_action: function (event) {
                assert.step('add_followers_action');
                assert.strictEqual(
                    event.data.action.context.default_res_model,
                    'res.partner',
                    "'The 'add channels' action should contain thread model in context'");
                assert.ok(
                    event.data.action.context.mail_invite_follower_channel_only,
                    "The 'add channels' action should be restricted to channels only");
                assert.strictEqual(
                    event.data.action.context.default_res_id,
                    100,
                    "The 'add channels' action should contain thread id in context");
                assert.strictEqual(
                    event.data.action.res_model,
                    'mail.wizard.invite',
                    "The 'add channels' action should be a wizard invite of mail module");
                assert.strictEqual(
                    event.data.action.type,
                    "ir.actions.act_window",
                    "The 'add channels' action should be of type 'ir.actions.act_window'");
            },
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollowers').length,
        1,
        "should have followers button"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        1,
        "followers dropdown should be opened"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_addChannelsButton').length,
        1,
        "followers dropdown should contain a 'add channels' button"
    );
    await document.querySelector('.o_FollowersMenu_addChannelsButton').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_dropdown').length,
        0,
        "followers dropdown should be closed after click on 'add channels'"
    );
    assert.verifySteps(
        ['add_followers_action'],
        "Click on 'add channels' should trigger the right action"
    );
});

QUnit.test('add followers', async function (assert) {
    assert.expect(10);
    const followerIds = [];
    await this.start({
        intercepts: {
            do_action: function (e) {
                assert.step('action:open_view');
                followerIds.push(1);
                e.data.options.on_close();
            },
        },
        async mockRPC(route, args) {
            if (route.includes('web/image/')) {
                return;
            } else if(route.includes('res.partner/read')) {
                assert.step('rpc:read_follower_ids');
                return [{
                    id: 100,
                    message_follower_ids: followerIds,
                }];
            } else if(route.includes('mail/read_followers')) {
                assert.step('rpc:read_followers_details');
                return {
                    followers: [{
                        partner_id: 42,
                        email: "bla@bla.bla",
                        id: 1,
                        is_active: true,
                        is_editable: true,
                        name: "François Perusse",
                    }]
                };
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "0",
        "Followers counter should be equal to 0"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_addFollowersButton').length,
        1,
        "followers dropdown should contain a 'Add followers' button"
    );

    await document.querySelector('.o_FollowersMenu_addFollowersButton').click();
    await afterNextRender();
    assert.verifySteps(['action:open_view', 'rpc:read_follower_ids', 'rpc:read_followers_details']);
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "1",
        "Followers counter should now be equal to 1"
    );
    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerMenu_follower').length,
        1,
        "Follower list should be refreshed and contain a follower"
    );
    assert.strictEqual(
        document.querySelector('.o_Follower_name').textContent,
        "François Perusse",
        "Follower added in follower list should be the one added"
    );
});

QUnit.test('add channels', async function (assert) {
    assert.expect(10);
    const followerIds = [];
    await this.start({
        intercepts: {
            do_action: function (e) {
                assert.step('action:open_view');
                followerIds.push(1);
                e.data.options.on_close();
            },
        },
        async mockRPC(route, args) {
            if (route.includes('web/image/')) {
                return;
            } else if(route.includes('res.partner/read')) {
                assert.step('rpc:read_follower_ids');
                return [{
                    id: 100,
                    message_follower_ids: followerIds,
                }];
            } else if(route.includes('mail/read_followers')) {
                assert.step('rpc:read_followers_details');
                return {
                    followers: [{
                        channel_id: 42,
                        email: "bla@bla.bla",
                        id: 1,
                        is_active: true,
                        is_editable: true,
                        name: "Supa channel",
                    }]
                };
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "0",
        "Followers counter should be equal to 0"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_addChannelsButton').length,
        1,
        "followers dropdown should contain a 'Add channels' button"
    );

    await document.querySelector('.o_FollowersMenu_addChannelsButton').click();
    await afterNextRender();
    assert.verifySteps(['action:open_view', 'rpc:read_follower_ids', 'rpc:read_followers_details']);
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "1",
        "Followers counter should now be equal to 1"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerMenu_follower').length,
        1,
        "Follower list should be refreshed and contain a follower"
    );
    assert.strictEqual(
        document.querySelector('.o_Follower_name').textContent,
        "Supa channel",
        "Follower added in follower list should be the one added"
    );
});

QUnit.test('follow', async function (assert) {
    assert.expect(12);
    const self = this;
    await this.start({
        debug: true,
        async mockRPC(route, args) {
            if (route.includes('web/image/')) {
                return;
            } else if (route.includes('res.partner/read')) {
                assert.step('rpc:read_follower_ids');
                return [{
                    id: 100,
                    message_follower_ids: [1],
                }]
            } else if (route.includes('message_subscribe')) {
                assert.step('rpc:message_subscribe');
                return;
            } else if(route.includes('mail/read_followers')) {
                assert.step('rpc:read_followers_details');
                return {
                    followers: [{
                        partner_id: self.env.session.partner_id,
                        email: "bla@bla.bla",
                        id: 1,
                        is_active: true,
                        is_editable: true,
                        name: "François Perusse",
                    }]
                };
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    await this.createFollowersMenuComponent(threadLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu').length,
        1,
        "should have followers menu component"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "0",
        "Followers counter should be equal to 0"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollow').length,
        1,
        "should have button follow"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollow').click();
    await afterNextRender();
    assert.verifySteps(['rpc:message_subscribe', 'rpc:read_follower_ids', 'rpc:read_followers_details']);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonFollow').length,
        0,
        "should not have follow button after clicked on follow"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowersMenu_buttonUnfollow').length,
        1,
        "should have unfollow button after clicked on follow"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowersMenu_buttonFollowersCount').textContent,
        "1",
        "Followers counter should be equal to 1"
    );

    await document.querySelector('.o_FollowersMenu_buttonFollowers').click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerMenu_follower').length,
        1,
        "Follower list should be refreshed and contain a follower"
    );
    assert.strictEqual(
        document.querySelector('.o_Follower_name').textContent,
        "François Perusse",
        "Follower added in follower list should be the one added"
    );
});

});
});
});
