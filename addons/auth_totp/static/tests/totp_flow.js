odoo.define('auth_totp.tours', function(require) {
"use strict";

const tour = require('web_tour.tour');
const ajax = require('web.ajax');

tour.register('totp_tour_setup', {
    test: true,
    url: '/web'
}, [{
    content: 'Open user account menu',
    trigger: '.o_user_menu .oe_topbar_name',
    run: 'click',
}, {
    content: "Open preferences / profile screen",
    trigger: '[data-menu=settings]',
    run: 'click',
}, {
    content: "Open totp wizard",
    trigger: 'button[name=totp_enable_wizard]',
}, {
    content: "Check that we have to enter enhanced security mode",
    trigger: 'p:contains("re-validate")',
    run: () => {},
}, {
    content: "Input password",
    trigger: '[name=password]',
    run: 'text demo', // FIXME: better way to do this?
}, {
    content: "Confirm",
    trigger: "button:contains(Confirm Password)",
}, {
    content: "Check the wizard has opened",
    trigger: 'p:contains("Scan the image below")',
    run: () => {}
}, {
    content: "Get secret from details",
    trigger: 'details:contains(the key you will get by clicking here)',
    run: async function(helpers) {
        const secret = this.$anchor.find('code').text();
        const token = await ajax.jsonRpc('/totphook', 'call', {
            secret
        });
        helpers._text(helpers._get_action_values('input[name=code]'), token);
        helpers._click(helpers._get_action_values('button.btn-primary:contains(Enable)'));
    }
}, { // re-navigate to the profile as unless hr is installed the preference dialog will close
    content: 'Open user account menu',
    trigger: '.o_user_menu .oe_topbar_name',
    run: 'click',
}, {
    content: "Open preferences / profile screen",
    trigger: '[data-menu=settings]',
    run: 'click',
}, {
    content: "Check that the button has changed",
    trigger: 'button:contains(Disable secure login)',
    run: () => {}
}]);

tour.register('totp_login_enabled', {
    test: true,
    url: '/'
}, [{
    content: "check that we're on the login page or go to it",
    trigger: 'input#login, a:contains(Sign in)'
}, {
    content: "input login",
    trigger: 'input#login',
    run: 'text demo',
}, {
    content: 'input password',
    trigger: 'input#password',
    run: 'text demo',
}, {
    content: "click da button",
    trigger: 'button:contains("Log in")',
}, {
    content: "expect totp screen",
    trigger: 'label:contains(Authentication Code)',
}, {
    content: "input code",
    trigger: 'input[name=totp_token]',
    run: async function (helpers) {
        const token = await ajax.jsonRpc('/totphook', 'call', {});
        helpers._text(helpers._get_action_values(), token);
        // FIXME: is there a way to put the button as its own step trigger without
        //        the tour straight blowing through and not waiting for this?
        helpers._click(helpers._get_action_values('button:contains("Verify")'));
    }
}, {
    content: "check we're logged in",
    trigger: ".o_user_menu .oe_topbar_name",
    run: () => {}
}, {
    // now go and disable totp would be annoying to do in a separate tour
    // because we'd need to login & totp again as HttpCase.authenticate can't
    // succeed w/ totp enabled
    content: 'Open user account menu',
    trigger: '.o_user_menu .oe_topbar_name',
    run: 'click',
}, {
    content: "Open preferences / profile screen",
    trigger: '[data-menu=settings]',
    run: 'click',
}, {
    content: "Open totp wizard",
    trigger: 'button[name=totp_disable]',
}, {
    content: "Check that we have to enter enhanced security mode",
    trigger: 'p:contains("re-validate")',
    run: () => {},
}, {
    content: "Input password",
    trigger: '[name=password]',
    run: 'text demo', // FIXME: better way to do this?
}, {
    content: "Confirm",
    trigger: "button:contains(Confirm Password)",
}, {
    content: "Reopen the preference / profile as we don't know whether HR is installed",
    trigger: '.o_user_menu .oe_topbar_name',
    run: 'click',
}, {
    content: "Open preferences / profile screen",
    trigger: '[data-menu=settings]',
    run: 'click',
}, {
    content: "Check that the button has changed",
    trigger: 'button:contains(Enable secure login)',
    run: () => {}
}]);

tour.register('totp_login_disabled', {
    test: true,
    url: '/'
}, [{
    content: "check that we're on the login page or go to it",
    trigger: 'input#login, a:contains(Sign in)'
}, {
    content: "input login",
    trigger: 'input#login',
    run: 'text demo',
}, {
    content: 'input password',
    trigger: 'input#password',
    run: 'text demo',
}, {
    content: "click da button",
    trigger: 'button:contains("Log in")',
}, { // normally we'd end there but being sure there's no more queries is a
    // pain in the ass so go and open the prifile screen
    content: 'Open user account menu',
    trigger: '.o_user_menu .oe_topbar_name',
    run: 'click',
}, {
    content: "Open preferences / profile screen",
    trigger: '[data-menu=settings]',
    run: 'click',
}, {
    content: "Check the pref screen has opened by looking for the change password button",
    trigger: 'button[name=preference_change_password]',
    run: () => {}
}]);

const columns = {};
tour.register('totp_admin_disables', {
    test: true,
    url: '/web'
}, [tour.STEPS.SHOW_APPS_MENU_ITEM, {
    content: 'Go to settings',
    trigger: '[data-menu-xmlid="base.menu_administration"]'
}, {
    content: 'Wait for page',
    trigger: 'div.title:contains("Settings")'
}, {
    content: "Open Users menu",
    trigger: '[data-menu-xmlid="base.menu_users"]'
}, {
    content: "Open Users view",
    trigger: '[data-menu-xmlid="base.menu_action_res_users"]'
}, {
    content: "Find Demo User",
    trigger: 'td.o_data_cell:contains("demo")',
    run: function (helpers) {
        const $titles = this.$anchor.closest('table').find('tr:first th');
        for (let i=0; i<$titles.length; ++i) {
            columns[$titles[i].getAttribute('data-name')] = i;
        }
        const $row = this.$anchor.closest('tr');
        const sel = $row.find('.o_list_record_selector input[type=checkbox]');
        const totp = $row[0].children[columns['totp_enabled']].querySelector('input');
        if (totp.checked) {
            helpers.click(sel);
        }
    }
}, {
    content: "Open Actions menu",
    trigger: 'button.dropdown-toggle:contains("Action")'
}, {
    content: "Select totp remover",
    trigger: 'a.dropdown-item:contains(Disable TOTP on users)'
}, { // enhanced security yo
    content: "Check that we have to enter enhanced security mode",
    trigger: 'p:contains("re-validate")',
    run: () => {},
}, {
    content: "Input password",
    trigger: '[name=password]',
    run: 'text admin', // FIXME: better way to do this?
}, {
    content: "Confirm",
    trigger: "button:contains(Confirm Password)",
}, {
    content: "check that demo user has been de-totp'd",
    trigger: "td.o_data_cell:contains(demo)",
    run: function () {
        const totpcell = this.$anchor.closest('tr')[0].children[columns['totp_enabled']];
        if (totpcell.querySelector('input').checked) {
            throw new Error("totp should have been disabled on demo user");
        }
    }
}])
});
