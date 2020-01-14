odoo.define('web.test_utils_create_control_panel', function (require) {
    "use strict";

    const { click, triggerEvent } = require('web.test_utils_dom');
    const ControlPanel = require('web.ControlPanel');
    const ControlPanelStore = require('web.ControlPanelStore');
    const { editInput, editSelect } = require('web.test_utils_fields');
    const makeTestEnvironment = require('web.test_env');
    const { prepareTarget } = require('web.test_utils_create');
    const { useListener } = require('web.custom_hooks');

    const helpers = {
        async toggleMenuItem(el, index) {
            await click(el.querySelectorAll('div.o_control_panel .o_menu_item > a')[index]);
        },
        async toggleMenuItemOption(el, itemIndex, optionIndex) {
            const itemEl = el.querySelectorAll('div.o_control_panel .o_menu_item')[itemIndex];
            await click(itemEl.querySelectorAll('a.o_item_option')[optionIndex]);
        },
        isItemSelected(el, index) {
            return el.querySelectorAll('div.o_control_panel .o_menu_item > a')[index].classList.contains('selected');
        },
        isOptionSelected(el, itemIndex, optionIndex) {
            const itemEl = el.querySelectorAll('div.o_control_panel .o_menu_item')[itemIndex];
            return itemEl.querySelectorAll('a.o_item_option')[optionIndex].classList.contains('selected');
        },

        // Button interactions
        getButtons(el) {
            return el.querySelector(('div.o_control_panel div.o_cp_bottom div.o_cp_buttons')).children;
        },

        // FilterMenu interactions
        async toggleFilterMenu(el) {
            await click(el.querySelector('div.o_control_panel div.o_filter_menu button'));
        },
        async toggleAddCustomFilter(el) {
            await click(el.querySelector('div.o_control_panel button.o_add_custom_filter'));
        },

        // GroupByMenu interactions
        async toggleGroupByMenu(el) {
            await click(el.querySelector('div.o_control_panel div.o_group_by_menu button'));
        },
        async toggleAddCustomGroupBy(el) {
            await click(el.querySelector('div.o_control_panel button.o_add_custom_group_by'));
        },

        // FavoriteMenu interactions
        async toggleFavoriteMenu(el) {
            await click(el.querySelector('div.o_control_panel div.o_favorite_menu button'));
        },
        async toggleSaveFilter(el) {
            await click(el.querySelector('div.o_control_panel .o_add_favorite button'));
        },
        async editFavoriteName(el, name) {
            await editInput(el.querySelector('div.o_control_panel .o_add_favorite input[type="text"]'), name);
        },
        async saveFavorite(el) {
            await click(el.querySelector('div.o_control_panel .o_add_favorite div div button'));
        },
        async deleteFavorite(el, index) {
            await click(el.querySelectorAll('div.o_favorite_menu .o_menu_item i.fa-trash-o')[index]);
        },

        // TimeRangeMenu interactions
        async toggleTimeRangeMenu(el) {
            await click(el.querySelector('div.o_control_panel div.o_time_range_menu > button'));
        },
        async selectField(el, fieldName) {
            await editSelect(
                el.querySelectorAll('div.o_control_panel div.o_time_range_section select')[0],
                fieldName
            );
        },
        async selectRange(el, range) {
            await editSelect(
                el.querySelectorAll('div.o_control_panel div.o_time_range_section select')[1],
                range
            );
        },
        async selectComparisonRange(el, comparisonRange) {
            await editSelect(
                el.querySelectorAll('div.o_control_panel div.o_time_range_section select')[2],
                comparisonRange
            );
        },
        async toggleTimeRangeMenuBox(el) {
            await click(el.querySelector('div.o_control_panel div.o_time_range_section input'));
        },
        async applyTimeRange(el) {
            await click(el.querySelector('div.o_control_panel div.o_time_range_menu ul button'));
        },

        // SearchBar interactions
        getFacetTexts(el) {
            return [
                ...el.querySelectorAll('div.o_control_panel .o_searchview .o_searchview_facet')
            ].map(e => e.innerText);
        },
        async editSearch(el, value) {
            await editInput(el.querySelector('div.o_control_panel .o_searchview_input'), value);
        },
        async validateSearch(el) {
            await triggerEvent(
                el.querySelector('div.o_control_panel .o_searchview_input'),
                'keydown', { key: 'Enter' }
            );
        },
    };

    function getHelpers(el) {
        if (!el) {
            el = document;
        }
        return Object.keys(helpers).reduce(
            (acc, fnName) => {
                acc[fnName] = helpers[fnName].bind(null, el);
                return acc;
            },
            {}
        );
    }

    async function createControlPanel(params = {}) {
        const config = params.cpStoreConfig || {};
        const debug = params.debug || false;
        const env = params.env || {};
        const handlers = params.handlers || {};
        const props = params.cpProps || {};

        class Parent extends owl.Component {
            constructor() {
                super();
                config.env = this.env;
                this.controlPanelStore = new ControlPanelStore(config);
                this.state = owl.hooks.useState(props);
                // useListener...

                if (params.search) {
                    useListener('search', params.search);
                }
            }
            async willStart() {
                await this.controlPanelStore.isReady;
            }
            mounted() {
                if (params['get-controller-query-params']) {
                    this.controlPanelStore.on('get-controller-query-params', this,
                        params['get-controller-query-params']);
                }
            }
            _handle(name, ev) {
                const fn = handlers[name];
                if (fn) {
                    fn(ev);
                }
            }
            // search: ...
            // get-owned-query-params: ...
            _onGetOwnedQueryParams(callback) {
                this._handle('_onGetOwnedQueryParams', callback);
            }

        }
        Parent.components = { ControlPanel };
        Parent.env = makeTestEnvironment(env);
        Parent.template = owl.tags.xml`
            <ControlPanel t-props="state"
                controlPanelStore="controlPanelStore"
            />
        `;
        // use env.service
        const parent = new Parent();
        await parent.mount(prepareTarget(debug), { position: 'first-child' });
        const el = parent.el;
        const helpers = getHelpers(el);
        helpers.getQuery = () => parent.controlPanelStore.getQuery();
        return { parent, el, helpers };
        // return { cp, helpers };
        // override cp.destroy
        const destroy = cp.destroy
        cp.destroy = function () {
            cp.destroy = destroy
            parent.destroy();
        }
    }

    return {
        createControlPanel,
        getHelpers,
    };
});