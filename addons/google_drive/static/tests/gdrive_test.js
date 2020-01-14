odoo.define('google_drive.gdrive_integration', function (require) {
    "use strict";

    const FormView = require('web.FormView');
    const testUtils = require('web.test_utils');
    const GoogleDriveMenu = require('google_drive.Sidebar');

    const { getHelpers: getCPHelpers } = testUtils.controlPanel;

    /*
     * @override
     * Avoid breaking other tests because of the new route
     * that the module introduces
     */
    const _getGoogleDocItemsOriginal = GoogleDriveMenu.prototype._getGoogleDocItems;
    GoogleDriveMenu.prototype._getGoogleDocItems = async () => [];

    QUnit.module('Google Drive Integration', {
        beforeEach() {
            // For our test to work, the _getGoogleDocItems function needs to be the original
            GoogleDriveMenu.prototype._getGoogleDocItems = _getGoogleDocItemsOriginal;

            this.data = {
                partner: {
                    fields: {
                        display_name: { string: "Displayed name", type: "char", searchable: true },
                    },
                    records: [
                        { id: 1, display_name: "Locomotive Breath" },
                        { id: 2, display_name: "Hey Macarena" },
                    ],
                },
            };
        },

        afterEach() {
            GoogleDriveMenu.prototype._getGoogleDocItems = async () => [];
        },
    }, function () {
        QUnit.module('Google Drive Sidebar');

        QUnit.test('rendering of the google drive attachments in Sidebar', async function (assert) {
            assert.expect(3);

            const form = await testUtils.createView({
                arch:
                    `<form string="Partners">
                        <field name="display_name"/>
                    </form>`,
                data: this.data,
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/dataset/call_kw/google.drive.config/get_google_drive_config':
                            assert.deepEqual(args.args, ['partner', 1],
                                'The route to get google drive config should have been called');
                            return [{
                                id: 27,
                                name: 'Cyberdyne Systems',
                            }];
                        case '/web/dataset/call_kw/google.drive.config/search_read':
                            return [{
                                google_drive_resource_id: "T1000",
                                google_drive_client_id: "cyberdyne.org",
                                id: 1,
                            }];
                        case '/web/dataset/call_kw/google.drive.config/get_google_drive_url':
                            assert.deepEqual(args.args, [27, 1, 'T1000'],
                                'The route to get the Google url should have been called');
                            return; // do not return anything or it will open a new tab.
                    }
                },
                model: 'partner',
                res_id: 1,
                View: FormView,
                viewOptions: {
                    hasSidebar: true,
                },
            });
            const cpHelpers = getCPHelpers(form.el);

            await cpHelpers.toggleSideBar();

            assert.containsOnce(form, '.oe_share_gdoc_item',
                "The button to the google action should be present");

            await cpHelpers.toggleMenuItem("Cyberdyne Systems");

            form.destroy();
        });

        QUnit.test('click on the google drive attachments after switching records', async function (assert) {
            assert.expect(4);

            let currentID;
            const form = await testUtils.createView({
                arch:
                    `<form string="Partners">
                        <field name="display_name"/>
                    </form>`,
                data: this.data,
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/dataset/call_kw/google.drive.config/get_google_drive_config':
                            assert.deepEqual(args.args, ['partner', currentID],
                                'The route to get google drive config should have been called');
                            return [{
                                id: 27,
                                name: 'Cyberdyne Systems',
                            }];
                        case '/web/dataset/call_kw/google.drive.config/search_read':
                            return [{
                                google_drive_resource_id: "T1000",
                                google_drive_client_id: "cyberdyne.org",
                                id: 1,
                            }];
                        case '/web/dataset/call_kw/google.drive.config/get_google_drive_url':
                            assert.deepEqual(args.args, [27, currentID, 'T1000'],
                                'The route to get the Google url should have been called');
                            return; // do not return anything or it will open a new tab.
                    }
                },
                model: 'partner',
                res_id: 1,
                View: FormView,
                viewOptions: {
                    hasSidebar: true,
                    ids: [1, 2],
                    index: 0,
                },
            });
            const cpHelpers = getCPHelpers(form.el);

            currentID = 1;
            await cpHelpers.toggleSideBar();
            await cpHelpers.toggleMenuItem("Cyberdyne Systems");

            await cpHelpers.pagerNext();

            currentID = 2;
            await cpHelpers.toggleSideBar();
            await cpHelpers.toggleMenuItem("Cyberdyne Systems");

            form.destroy();
        });
    });
});
