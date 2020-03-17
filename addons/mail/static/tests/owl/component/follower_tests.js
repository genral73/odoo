odoo.define('mail.component.FollowerTests', function (require) {
'use strict';

const Follower = require('mail.component.Follower');
const {
    afterEach: utilsAfterEach,
    afterNextRender,
    beforeEach: utilsBeforeEach,
    pause,
    start: utilsStart,
} = require('mail.messagingTestUtils');
const useStore = require('mail.hooks.useStore');

const { Component, tags: { xml } } = owl;

QUnit.module('mail.messaging', {}, function () {
QUnit.module('component', {}, function () {
QUnit.module('Follower', {
    beforeEach() {
        utilsBeforeEach(this);
        this.createFollowerComponent = async (followerLocalId) => {
            Follower.env = this.env;
            this.follower = new Follower(null, { followerLocalId });
            await this.follower.mount(this.widget.el);
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
        if (this.follower) {
            this.follower.destroy();
        }
        if (this.widget) {
            this.widget.destroy();
        }
        this.env = undefined;
        delete Follower.env;
    }
});

QUnit.test('base rendering not editable', async function (assert) {
    assert.expect(5);

    await this.start({
        async mockRPC(route, args) {
            if (route === 'web/image/mail.channel/1/image_128') {
                return;
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: false,
        name: "François Perusse",
        partner_id: null,
    }, threadLocalId);
    await this.createFollowerComponent(followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_details').length,
        1,
        "should display a details part"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_avatar').length,
        1,
        "should display the avatar of the follower"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_name').length,
        1,
        "should display the name of the follower"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_button').length,
        0,
        "should have no button as follower is not editable"
    );
});

QUnit.test('base rendering editable', async function (assert) {
    assert.expect(6);

    await this.start({
        async mockRPC(route, args) {
            if (route === 'web/image/mail.channel/1/image_128') {
                return;
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
        partner_id: null,
    }, threadLocalId);
    await this.createFollowerComponent(followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_details').length,
        1,
        "should display a details part"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_avatar').length,
        1,
        "should display the avatar of the follower"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_name').length,
        1,
        "should display the name of the follower"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_editButton').length,
        1,
        "should have an edit button"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_removeButton').length,
        1,
        "should have a remove button"
    );
});

QUnit.test('click on channel follower details', async function (assert) {
    assert.expect(4);

    await this.start({
        async mockRPC(route, args) {
            if (route === 'web/image/mail.channel/1/image_128') {
                return;
            }
            if (route === '/web/dataset/call_kw/mail.channel/channel_join_and_get_info') {
                assert.step('channel_join');
                return {
                    id: 1,
                    channel_type: 'a',
                };
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "channel",
    }, threadLocalId);
    await this.createFollowerComponent(followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_details').length,
        1,
        "should display a details part"
    );

    await document.querySelector('.o_Follower_details').click();
    assert.verifySteps(['channel_join'], 'channel should be joined as channel does not exist locally');
});

QUnit.test('click on partner follower details', async function (assert) {
    assert.expect(7);

    await this.start({
        async mockRPC(route, args) {
            if (route === 'web/image/res.partner/3/image_128') {
                return;
            }
            return this._super(...arguments);
        },
        intercepts: {
            do_action: function (event) {
                assert.step('do_action');
                assert.strictEqual(
                    event.data.action.res_id,
                    3,
                    'The redirect action should redirect to the right res id (3)');
                assert.strictEqual(
                    event.data.action.res_model,
                    'res.partner',
                    'The redirect action should redirect to the right res model (res.partner)');
                assert.strictEqual(
                    event.data.action.type,
                    "ir.actions.act_window",
                    'The redirect action should be of type "ir.actions.act_window"');
            },
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        partner_id: this.env.session.partner_id,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
    }, threadLocalId);
    await this.createFollowerComponent(followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_details').length,
        1,
        "should display a details part"
    );

    await document.querySelector('.o_Follower_details').click();
    assert.verifySteps(['do_action'], 'clicking on follower should redirect to partner form view');
});

QUnit.test('click on remove follower', async function (assert) {
    assert.expect(5);

    await this.start({
        async mockRPC(route, args) {
            if (route === 'web/image/res.partner/3/image_128') {
                return;
            }
            if (route.includes('message_unsubscribe')) {
                assert.step('message_unsubscribe');
                return;
            }
            return this._super(...arguments);
        }
    });
    // need a thread, otherwise rpc call will not be triggered
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        partner_id: this.env.session.partner_id,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
    }, threadLocalId);

    // Create a parent component to surround the Follower component in order to be able
    // to check that follower component has been destroyed
    class ParentComponent extends Component {
        constructor(...args) {
            super(... args);
            this.storeProps = useStore((state, props) => {
                const follower = state.followers && state.followers[props.followerLocalId];
                return { follower };
            });
        }
    }
    ParentComponent.env = this.env;
    Object.assign(ParentComponent, {
        components: { Follower },
        props: { followerLocalId: String },
        template: xml`<div>
            <p>parent</p>
            <t t-if="storeProps.follower">
                <Follower followerLocalId="props.followerLocalId"/>
            </t>
        </div>`,
    });
    const component = new ParentComponent(null, { followerLocalId });
    await component.mount(this.widget.el);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_removeButton').length,
        1,
        "should display a remove button"
    );

    await document.querySelector('.o_Follower_removeButton').click();
    assert.verifySteps(
        ['message_unsubscribe'],
        "clicking on remove button should call 'message_unsubscribe' route");
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        0,
        "should no more have follower component"
    );
    component.destroy();
});

QUnit.test('click on edit follower', async function (assert) {
    assert.expect(5);

    await this.start({
        hasDialog: true,
        async mockRPC(route, args) {
            if (route === 'web/image/res.partner/3/image_128') {
                return;
            }
            if (route.includes('/mail/read_subscription_data')) {
                assert.step('fetch_subtypes');
                return [{
                    default: true,
                    followed: true,
                    internal: false,
                    id: 1,
                    name: "Dummy test",
                    res_model: 'res.partner'
                }];
            }
            return this._super(...arguments);
        },
    });
    const threadLocalId = this.env.store.dispatch('_createThread', {
        id: 100,
        _model: 'res.partner',
    });
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        partner_id: this.env.session.partner_id,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
    }, threadLocalId);
    await this.createFollowerComponent(followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_Follower').length,
        1,
        "should have follower component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_Follower_editButton').length,
        1,
        "should display an edit button"
    );

    await document.querySelector('.o_Follower_editButton').click();
    await afterNextRender();
    assert.verifySteps(['fetch_subtypes'], 'clicking on edit follower should fetch subtypes');

    // Check the dialog has been created (dialogService does not work in tests)
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtypesEditDialog').length,
        1,
        "A dialog allowing to edit follower subtypes should have been created"
    );
});

});
});
});
