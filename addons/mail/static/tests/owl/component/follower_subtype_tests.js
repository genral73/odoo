odoo.define('mail.component.FollowerSubtypeTests', function (require) {
'use strict';

const FollowerSubtype = require('mail.component.FollowerSubtype');
const {
    afterEach: utilsAfterEach,
    beforeEach: utilsBeforeEach,
    pause,
    start: utilsStart,
} = require('mail.messagingTestUtils');

QUnit.module('mail.messaging', {}, function () {
QUnit.module('component', {}, function () {
QUnit.module('FollowerSubtype', {
    beforeEach() {
        utilsBeforeEach(this);
        this.createFollowerSubtypeComponent = async (subtypeId, followerLocalId, otherProps) => {
            FollowerSubtype.env = this.env;
            this.subtype = new FollowerSubtype(
                null,
                Object.assign({ followerLocalId, subtypeId }, otherProps)
            );
            await this.subtype.mount(this.widget.el);
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
        if (this.subtype) {
            this.subtype.destroy();
        }
        if (this.widget) {
            this.widget.destroy();
        }
        this.env = undefined;
        delete FollowerSubtype.env;
    }
});

QUnit.test('simplest layout of a followed subtype', async function (assert) {
    assert.expect(5);

    await this.start();
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
        partner_id: null,
    }, 'dummy_and_useless_thread_local_id');
    await this.env.store.dispatch('_setFollowerSubtypes', followerLocalId, [{
        default: true,
        followed: true,
        internal: false,
        id:1,
        name: "Dummy test",
        res_model: 'res.partner'
    }]);
    await this.createFollowerSubtypeComponent(1, followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype').length,
        1,
        "should have follower subtype component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype_label').length,
        1,
        "should have a label"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype_checkbox').length,
        1,
        "should have a checkbox"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowerSubtype_label').textContent,
        "Dummy test",
        "should have the name of the subtype as label"
    );
    assert.ok(
        document.querySelector('.o_FollowerSubtype_checkbox').checked,
        "checkbox should be checked as follower subtype is followed"
    );
});

QUnit.test('simplest layout of a not followed subtype', async function (assert) {
    assert.expect(5);

    await this.start();
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
        partner_id: null,
    }, 'dummy_and_useless_thread_local_id');
    await this.env.store.dispatch('_setFollowerSubtypes', followerLocalId, [{
        default: true,
        followed: false,
        internal: false,
        id:1,
        name: "Dummy test",
        res_model: 'res.partner'
    }]);
    await this.createFollowerSubtypeComponent(1, followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype').length,
        1,
        "should have follower subtype component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype_label').length,
        1,
        "should have a label"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype_checkbox').length,
        1,
        "should have a checkbox"
    );
    assert.strictEqual(
        document.querySelector('.o_FollowerSubtype_label').textContent,
        "Dummy test",
        "should have the name of the subtype as label"
    );
    assert.notOk(
        document.querySelector('.o_FollowerSubtype_checkbox').checked,
        "checkbox should not be checked as follower subtype is not followed"
    );
});

QUnit.test('toggle follower subtype checkbox', async function (assert) {
    assert.expect(5);

    await this.start();
    const followerLocalId = await this.env.store.dispatch('_createFollower', {
        channel_id: 1,
        email: "bla@bla.bla",
        id: 2,
        is_active: true,
        is_editable: true,
        name: "François Perusse",
        partner_id: null,
    }, 'dummy_and_useless_thread_local_id');
    await this.env.store.dispatch('_setFollowerSubtypes', followerLocalId, [{
        default: true,
        followed: false,
        internal: false,
        id:1,
        name: "Dummy test",
        res_model: 'res.partner'
    }]);
    await this.createFollowerSubtypeComponent(1, followerLocalId);
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype').length,
        1,
        "should have follower subtype component"
    );
    assert.strictEqual(
        document.querySelectorAll('.o_FollowerSubtype_checkbox').length,
        1,
        "should have a checkbox"
    );
    assert.notOk(
        document.querySelector('.o_FollowerSubtype_checkbox').checked,
        "checkbox should not be checked as follower subtype is not followed"
    );

    await document.querySelector('.o_FollowerSubtype_checkbox').click();
    assert.ok(
        document.querySelector('.o_FollowerSubtype_checkbox').checked,
        "checkbox should now be checked"
    );

    await document.querySelector('.o_FollowerSubtype_checkbox').click();
    assert.notOk(
        document.querySelector('.o_FollowerSubtype_checkbox').checked,
        "checkbox should be no more checked"
    );
});

});
});
});
