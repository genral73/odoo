odoo.define('web.test_utils_create_control_panel', function (require) {
    "use strict";

    const { click, triggerEvent } = require('web.test_utils_dom');
    const ControlPanel = require('web.ControlPanel');
    const ControlPanelModel = require('web.ControlPanelModel');
    const { editInput, editSelect, editAndTrigger } = require('web.test_utils_fields');
    const makeTestEnvironment = require('web.test_env');
    const { prepareTarget } = require('web.test_utils_create');

    const { Component } = owl;
    const { useRef, useState } = owl.hooks;
    const { xml } = owl.tags;

    /**
     * Helper method to retrieve a distinct item from a collection of elements defined
     * by the given 'selector' string. It can either be the index of the item, its
     * inner text or a function determining what to look for.
     * @param {HTMLElement} el
     * @param {string} selector
     * @param {(number|string|Function)} elFinder
     */
    function findItem(el, selector, elFinder) {
        const elements = [...el.querySelectorAll(selector)];
        if (!elements.length) {
            throw new Error(`No element found with selector "${selector}".`);
        }
        switch (typeof elFinder) {
            case 'number':
                const element = elements[elFinder];
                if (!element) {
                    throw new Error(`No element with selector "${selector}" at index ${elFinder}.`);
                }
                return element;
            case 'string':
                const stringMatch = elements.find(e => e.innerText.trim() === elFinder);
                if (!stringMatch) {
                    throw new Error(`No element with selector "${selector}" containing "${elFinder}".`);
                }
                return stringMatch;
            case 'function':
                const fnMatch = elements.find(elFinder);
                if (!fnMatch) {
                    throw new Error(`No element with selector "${selector}" matching the given function.`);
                }
                return fnMatch;
            default:
                throw new Error(`Invalid provided element finder: must be a number|string|function.`);
        }
    }

    const helpers = {
        // Generic interactions
        async toggleMenuItem({ el, rootEl }, itemFinder) {
            const item = findItem(el, `${rootEl} .o_menu_item > a`, itemFinder);
            await click(item);
        },
        async toggleMenuItemOption({ el, rootEl }, itemFinder, optionFinder) {
            const item = findItem(el, `${rootEl} .o_menu_item > a`, itemFinder);
            const option = findItem(item.parentNode, 'a.o_item_option', optionFinder);
            await click(option);
        },
        isItemSelected({ el, rootEl }, itemFinder) {
            const item = findItem(el, `${rootEl} .o_menu_item > a`, itemFinder);
            return item.classList.contains('selected');
        },
        isOptionSelected({ el, rootEl }, itemFinder, optionFinder) {
            const item = findItem(el, `${rootEl} .o_menu_item > a`, itemFinder);
            const option = findItem(item.parentNode, 'a.o_item_option', optionFinder);
            return option.classList.contains('selected');
        },
        getMenuItemTexts({ el, rootEl }) {
            return [...el.querySelectorAll(`${rootEl} .o_dropdown ul .o_menu_item`)].map(
                e => e.innerText.trim()
            );
        },

        // Button interactions
        getButtons({ el, rootEl }) {
            return el.querySelector((`${rootEl} div.o_cp_bottom div.o_cp_buttons`)).children;
        },

        // FilterMenu interactions
        async toggleFilterMenu({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_filters_menu button`));
        },
        async toggleAddCustomFilter({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} button.o_add_custom_filter`));
        },
        async applyFilter({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} div.o_add_filter_menu > button.o_apply_filter`));
        },

        // GroupByMenu interactions
        async toggleGroupByMenu({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_group_bys_menu button`));
        },
        async toggleAddCustomGroup({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} button.o_add_custom_group_by`));
        },
        async selectGroup({ el, rootEl }, fieldName) {
            await editSelect(
                el.querySelector(`${rootEl} select.o_group_by_selector`),
                fieldName
            );
        },
        async applyGroup({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} div.o_add_group_by_menu > button.o_apply_group_by`));
        },

        // FavoriteMenu interactions
        async toggleFavoriteMenu({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_favorites_menu button`));
        },
        async toggleSaveFavorite({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_favorites_menu .o_add_favorite button`));
        },
        async editFavoriteName({ el, rootEl }, name) {
            await editInput(el.querySelector(`${rootEl} .o_favorites_menu .o_add_favorite input[type="text"]`), name);
        },
        async saveFavorite({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_favorites_menu .o_add_favorite button.o_save_favorite`));
        },
        async deleteFavorite({ el, rootEl }, favoriteFinder) {
            const favorite = findItem(el, `${rootEl} .o_favorites_menu .o_menu_item`, favoriteFinder);
            await click(favorite.querySelector('i.fa-trash-o'));
        },

        // TimeRangeMenu interactions
        async toggleTimeRangeMenu({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} div.o_time_range_menu > button`));
        },
        async selectField({ el, rootEl }, fieldName) {
            await editSelect(
                findItem(el, `${rootEl} div.o_time_range_section select`, 0),
                fieldName
            );
        },
        async selectRange({ el, rootEl }, range) {
            await editSelect(
                findItem(el, `${rootEl} div.o_time_range_section select`, 1),
                range
            );
        },
        async selectComparisonRange({ el, rootEl }, comparisonRange) {
            await editSelect(
                findItem(el, `${rootEl} div.o_time_range_section select`, 2),
                comparisonRange
            );
        },
        async toggleTimeRangeMenuBox({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} div.o_time_range_section input`));
        },
        async applyTimeRange({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} div.o_time_range_menu ul button`));
        },

        // SearchBar interactions
        getFacetTexts({ el, rootEl }) {
            return [...el.querySelectorAll(`${rootEl} .o_searchview .o_searchview_facet`)].map(
                facet => facet.innerText.trim()
            );
        },
        async removeFacet({ el, rootEl }, facetText = 0) {
            const facet = findItem(el, `${rootEl} .o_searchview .o_searchview_facet`, facetText);
            await click(facet.querySelector('.o_facet_remove'));
        },
        async editSearch({ el, rootEl }, value) {
            await editInput(el.querySelector(`${rootEl} .o_searchview_input`), value);
        },
        async validateSearch({ el, rootEl }) {
            await triggerEvent(
                el.querySelector(`${rootEl} .o_searchview_input`),
                'keydown', { key: 'Enter' }
            );
        },

        // Sidebar interactions
        async toggleSideBar({ el, rootEl }, menuName = "Action") {
            const dropdown = findItem(el, `${rootEl} .o_cp_sidebar button`, menuName);
            await click(dropdown);
        },

        // Pager interactions
        async pagerPrevious({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_pager button.o_pager_previous`));
        },
        async pagerNext({ el, rootEl }) {
            await click(el.querySelector(`${rootEl} .o_pager button.o_pager_next`));
        },
        getPagerValue({ el, rootEl }) {
            const pagerValue = el.querySelector(`${rootEl} .o_pager_counter .o_pager_value`);
            switch (pagerValue.tagName) {
                case 'INPUT':
                    return pagerValue.value;
                case 'SPAN':
                    return pagerValue.innerText.trim();
            }
        },
        getPagerSize({ el, rootEl }) {
            return el.querySelector(`${rootEl} .o_pager_counter span.o_pager_limit`).innerText.trim();
        },
        async setPagerValue({ el, rootEl }, value) {
            let pagerValue = el.querySelector(`${rootEl} .o_pager_counter .o_pager_value`);
            if (pagerValue.tagName === 'SPAN') {
                await click(pagerValue);
            }
            pagerValue = el.querySelector(`${rootEl} .o_pager_counter input.o_pager_value`);
            if (!pagerValue) {
                throw new Error("Pager value is being edited and cannot be changed.");
            }
            await editAndTrigger(pagerValue, value, ['change', 'blur']);
        },

        // View switcher
        async switchView({ el, rootEl }, viewType) {
            await click(el.querySelector(`${rootEl} button.o_switch_view.o_${viewType}`));
        },
    };

    function getHelpers(el, root = "div.o_control_panel") {
        if (!el) {
            el = document;
        }
        const helperInfo = { el, rootEl: root };
        return Object.keys(helpers).reduce(
            (acc, fnName) => {
                acc[fnName] = helpers[fnName].bind(null, helperInfo);
                return acc;
            },
            {}
        );
    }

    async function createControlPanel(params = {}) {
        const config = params.cpStoreConfig || {};
        const debug = params.debug || false;
        const env = params.env || {};
        const props = Object.assign({
            action: {},
            fields: {},
        }, params.cpProps);

        class Parent extends Component {
            constructor() {
                super();
                config.env = this.env;
                this._controlPanelModel = new ControlPanelModel(config);
                this.state = useState(props);
                this.controlPanel = useRef("controlPanel");
            }
            async willStart() {
                await this._controlPanelModel.isReady;
            }
            mounted() {
                if (params['get-controller-query-params']) {
                    this._controlPanelModel.on('get-controller-query-params', this,
                        params['get-controller-query-params']);
                }
                if (params.search) {
                    this._controlPanelModel.on('search', this, params.search);
                }
            }
        }
        Parent.components = { ControlPanel };
        Parent.env = makeTestEnvironment(env);
        Parent.template = xml`
            <ControlPanel
                t-ref="controlPanel"
                t-props="state"
                controlPanelModel="_controlPanelModel"
            />
        `;

        const parent = new Parent();
        await parent.mount(prepareTarget(debug), { position: 'first-child' });

        const controlPanel = parent.controlPanel.comp;
        const destroy = controlPanel.destroy;
        controlPanel.destroy = function () {
            controlPanel.destroy = destroy;
            parent.destroy();
        };

        const el = controlPanel.el;

        const helpers = getHelpers(el);
        helpers.getQuery = () => parent._controlPanelModel.getQuery();

        return { controlPanel, el, helpers };
    }

    return {
        createControlPanel,
        getHelpers,
    };
});
