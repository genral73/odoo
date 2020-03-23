odoo.define('mass_mailing.mass_mailing_tour', function (require) {
    "use strict";

    var core = require('web.core');
    var _t = core._t;
    var tour = require('web_tour.tour');
    var now = moment();

    tour.register('mass_mailing_tour', {
        url: '/web',
    }, [tour.stepUtils.showAppsMenuItem(), {
        trigger: '.o_app[data-menu-xmlid="mass_mailing.mass_mailing_menu_root"]',
        content: _t("Want to <b>Reach your Audience</b> fast and cheap ? It's starts with a click here."),
        position: 'bottom',
        edition: 'enterprise',
    }, {
        trigger: '.o_app[data-menu-xmlid="mass_mailing.mass_mailing_menu_root"]',
        content: _t("Want to <b>Reach your Audience</b> fast and cheap ? It's starts with a click here."),
        edition: 'community',
    }, {
        trigger: '.o-kanban-button-new',
        content: _t("First, let's create your first <b>Mailing</b>."),
        position: 'bottom',
    }, {
        trigger: 'input[name="subject"]',
        content: _t('This is the <b>subject</b> that recipients will see in their inbox (e.g. : "' + now.format("MMMM") + ' Newsletter")'),
        position: 'bottom',
        run: 'text ' + now.format("MMMM") + " Newsletter",
    }, {
        trigger: 'div[name="contact_list_ids"] > .o_input_dropdown > input[type="text"]',
        content: _t('Then, we will create a new <b>Mailing List</b> on the fly.'),
        position: 'bottom',
        run: 'text Mailing List Test',
    }, {
        trigger: 'li.o_m2o_dropdown_option',
        run: 'click',
        auto: true,
    }, {
        trigger: 'div[name="body_arch"] iframe a.dropdown-item',
        content: _t('Click on a <b>mailing style</b> to pick it. Then, <b>edit the content</b> to make it your own.'),
        position: 'bottom',
        run: function (actions) {
            actions.click();
            $('div.o_mail_no_options').val("<p>Test</p>");
        },
    }, {
        trigger: '.o_form_button_save',
        content: _t("Don't forget to click <b>Save</b> to keep your changes."),
        position: 'bottom',
    }, {
        trigger: '.o_menu_sections a[data-menu-xmlid="mass_mailing.mass_mailing_mailing_list_menu"]',
        content: _t("Through here, we'll now access your <b>Mailing List</b> to add some <b>Mailing Contacts</b>."),
        position: 'bottom',
    }, {
        trigger: '.dropdown-menu a[data-menu-xmlid="mass_mailing.menu_email_mass_mailing_lists"]',
        content: _t("Click on the <b>Mailing List</b> menu item."),
        position: 'right',
    }, {
        trigger: '.o_kanban_record',
        content: _t("Click on its card to start populating it."),
        position: 'bottom',
    }, {
        trigger: '.o_list_button_add',
        content: _t("We'll <b>Create a Mailing Contact</b> manually. But you could also <b>Import</b> a list you would had from a previous system."),
        position: 'bottom',
    }, {
        trigger: 'input[name="name"]',
        content: _t("First, what's the <b>Name</b> of this <b>Mailing Contact</b> ?"),
        run: "text Test Name"
    }, {
        trigger: 'input[name="email"]',
        content: _t("Second, we'll set an <b>Email Address</b>."),
        run: "text test@test.com"
    }, {
        trigger: '.o_form_button_save',
        content: _t("Just <b>Save</b> it and you're done already."),
        position: 'bottom',
    }, {
        trigger: '.o_menu_sections a[data-menu-xmlid="mass_mailing.mass_mailing_menu"]',
        content: _t("Let's go back to your <b>Mailing</b> now."),
        position: 'bottom',
    }, {
        trigger: '.o_kanban_record',
        content: _t("As you can see, the <b>Recipient count</b> has been updated. Click again to open the form."),
        position: 'bottom',
    }, {
        trigger: 'button[name="action_test"]',
        content: _t("Before sending a <b>Mailing</b>, click on <b>\"Test\"</b> to check how it looks like in your inbox."),
        position: 'bottom',
    }, {
        trigger: 'button[name="send_mail_test"]',
        content: _t("If this email address is yours, click <b>Send Sample Mail</b> to send yourself a copy."),
        position: 'bottom',
    }, {
        trigger: 'button[name="action_schedule"]',
        content: _t("Now that your Mailing is ready, let's <b>Schedule</b> it in the future. It will be send automatically from there."),
        position: 'bottom',
    }, {
        trigger: 'input[name="schedule_date"]',
        content: _t("Pick a <b>date and time</b>."),
        run: "text 12/20/2030 13:00:00",
    }, {
        trigger: 'button[name="set_schedule_date"]',
        content: _t("Click <b>Schedule</b> to confirm."),
        position: 'bottom',
    }, {
        trigger: '.o_back_button',
        content: _t("By using the <b>Breadcrumb</b>, you can navigate back to the overview."),
        position: 'bottom',
        run: 'click',
    }]
    );
});
